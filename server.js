var request = require('request');
var express  = require('express');
var cookieParser  = require('cookie-parser');
var bodyParser  = require('body-parser');
var session = require('express-session');
var gcal = require('google-calendar');
var passport = require('passport');
var mongojs = require('mongojs');
var MongoStore = require('connect-mongo')(session);
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var intervals = require('./shared/intervals');
var config = require('./config');

// create an express app
var app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({
  //store: new MongoStore({url: MONGO_URL + '/' + MONGO_DB + '/sessions', ssl: PRODUCTION}), // TODO: use SSL
  store: new MongoStore({
    url: config.MONGO_URL + '/' + config.MONGO_DB + '/sessions',
    stringify: false
  }),
  secret: 'youre not going to guess this one',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());

// create a connection to mongodb
var db = mongojs(config.MONGO_URL + '/' + config.MONGO_DB, ['users', 'sessions']);

// serve static content
app.use('/', express.static(__dirname + '/client'));
app.use('/node_modules/', express.static(__dirname + '/node_modules'));
app.use('/shared/', express.static(__dirname + '/shared'));

app.listen(config.PORT);
console.log('Server listening at http://localhost:' + config.PORT);

// Setup passportjs server for authentication
passport.use(new GoogleStrategy({
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.CALLBACK_URL,
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar']
    },
    function(accessToken, refreshToken, params, profile, done) {
      profile.auth = {
        accessToken: accessToken,
        refreshToken: refreshToken,
        params: params
      };
      return done(null, profile);
    }
));

app.get('/auth',
    passport.authenticate('google', {
      session: false,
      accessType: 'offline',
      approvalPrompt: 'force' // 'auto' (default) or 'force'
      // TODO: smarter auth, only force approval prompt when we don't have a refreshToken
    }));

app.get('/auth/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/' }),
    function(req, res) {
      // copy needed fields to the session object
      var email = req.user._json.email;
      var expires_in = req.user.auth.params.expires_in * 1000; // ms
      req.session.expires = new Date(Date.now() + expires_in).toISOString();
      req.session.email = email;
      req.session.accessToken = req.user.auth.accessToken;
      req.session.refreshToken = req.user.auth.refreshToken;

      var DAY = 24 * 60 * 60 * 1000;
      var maxAge = 14 * DAY; // 14 days
      req.session.cookie.expires = new Date(Date.now() + maxAge).toISOString();
      req.session.cookie.maxAge = maxAge;

      // store the accessToken and refreshToken in the user's profile
      updateUser({
        email: email,
        auth: {
          accessToken: req.user.auth.accessToken,
          refreshToken: req.user.auth.refreshToken
        }
      }, function (err) {
        if (err) console.log('Error', err);

        var redirectTo = req.session.redirectTo || '/';
        res.redirect(redirectTo);
      });
    });

app.get('/user/signin', function(req, res, next) {
  req.session.redirectTo = req.query.redirectTo || '/';
  return res.redirect('/auth');
});

app.get('/user/signout', function(req, res, next) {
  req.session.destroy(function(err) {
    res.redirect(req.query.redirectTo || '/');
  })
});

function auth(req, res, next) {
  if (!req.session.accessToken) {
    req.session.redirectTo = req.url;
    return res.redirect('/auth');
  }
  else if (new Date(req.session.expires) < (Date.now() + 5 * 60 * 1000)) {
    // access token expires within 5 minutes, get a new one
    refreshAccessToken(req.session.refreshToken, function (err, result) {
      if (err) return sendError(res, err);

      var expires_in = result.expires_in * 1000;
      req.session.accessToken = result.access_token;
      req.session.expires = new Date(Date.now() + expires_in).toISOString();
      req.session.cookie.expires = req.session.expires;
      req.session.cookie.maxAge = expires_in;

      next();
    });
  }
  else {
    return next();
  }
}

// retrieve user settings
// note: this call does not authorize the session, returns {loggedIn: false} when not logged in
app.get('/user', function(req, res, next) {
  var loggedIn = req.session.accessToken != null;
  if (loggedIn) {
    var email = req.session.email;
    db.users.findOne({email: email}, function (err, user) {
      if(err) return res.status(500).send(err.toString());
      if (user == null) {
        // get user info from google
        getUserInfo(req.session.accessToken, function (err, user) {
          if(err) return res.status(500).send(err.toString());

          // store user in the database
          updateUser(user, function (err, user) {
            if(err) return res.status(500).send(err.toString());
            return res.json(user);
          })
        });
      }
      else {
        user.loggedIn = true;
        return res.json(user);
      }
    });
  }
  else {
    // not logged in
    return res.json({loggedIn: false});
  }
});


// store (update) user settings
app.put('/user', auth);
app.put('/user', function(req, res, next) {
  var user = req.body;
  var email = req.session.email;
  if (email && (user.email == email || user.email == null)) { // only allow saving the users own profile
    user.email = email;

    updateUser(user, function (err, user) {
      if(err) return res.status(500).send(err.toString());
      return res.json(user);
    });
  }
  else {
    return res.status(403).send('Not logged in');
  }
});

// Delete the user
app.delete('/user', auth);
app.delete('/user', function(req, res, next) {
  var email = req.session.email;
  var accessToken = req.session.accessToken;

  // remove the user from our database
  db.users.remove({email: email}, function (err, result) {
    //revoke granted permissions at google
    var url = 'https://accounts.google.com/o/oauth2/revoke?token=' + accessToken;
    request(url, function (error, response, body) {
      // remove the users session (with authentication token)
      req.session.destroy(function(err) {
        res.json('User ' + email + ' deleted');
      })
    });
  });
});

function updateUser(user, callback) {
  user.updated = new Date().toISOString();

  // add field with default calendar
  if (!user.calendars) {
    user.calendars = [user.email];
  }

  db.users.findAndModify({
    query: {email: user.email},
    update: {
      $set: user,
      $inc: {seq: 1}
    },
    upsert: true,   // create a new document when not existing
    new: true       // return the newly created or the updated document
  }, function (err, updatedUser, lastErrorObject) {
    callback(err, updatedUser);
  });
}

app.all('/calendar*', auth);

app.get('/calendar', function(req, res){
  var accessToken = req.session.accessToken;

  gcal(accessToken).calendarList.list(function(err, data) {
    if(err) return sendError(res, err);
    return res.json(data);
  });
});

app.get('/calendar/:calendarId', function(req, res){
  var accessToken     = req.session.accessToken;
  var calendarId      = req.params.calendarId;

  var now = new Date();
  var defaultTimeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
      now.getHours(), Math.round(now.getMinutes() / 30) * 30, 0);
  var defaultTimeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

  var options = {
    singleEvents: true, // expand recurring events
    orderBy: 'startTime',
    timeMin: req.query.timeMin || defaultTimeMin.toISOString(),
    timeMax: req.query.timeMax || defaultTimeMax.toISOString()
  };

  gcal(accessToken).events.list(calendarId, options, function(err, data) {
    if(err) return sendError(res, err);
    return res.json(data);
  });
});

// TODO: remove this?
app.get('/calendar/:calendarId/add', function(req, res){
  var accessToken     = req.session.accessToken;
  var calendarId      = req.params.calendarId;
  var text            = req.query.text || 'Hello World';

  gcal(accessToken).events.insert(calendarId, text, function(err, data) {
    if(err) return sendError(res, err);
    return res.redirect('/calendar/'+calendarId);
  });
});

// insert a new event
app.put('/calendar/:calendarId', function(req, res){
  var accessToken = req.session.accessToken;
  var calendarId = req.params.calendarId;
  var event = req.body;

  gcal(accessToken).events.insert(calendarId, event, function(err, createdEvent) {
    if(err) return sendError(res, err);
    return res.json(createdEvent);
  });
});

app.delete('/calendar/:calendarId/:eventId/remove', function(req, res){
  var accessToken     = req.session.accessToken;
  var calendarId      = req.params.calendarId;
  var eventId         = req.params.eventId;

  gcal(accessToken).events.delete(calendarId, eventId, function(err, data) {
    if(err) return sendError(res, err);
    return res.redirect('/calendar/'+calendarId);
  });
});

app.get('/freeBusy/:calendarId?', function(req, res) {
  var calendarId  = req.params.calendarId; // TODO: retrieve for requested calendarId
  var accessToken = req.session.accessToken;
  var email       = req.session.email;
  db.users.findOne({email: email}, function (err, user) {
    var items;
    if (user && user.calendars) {
      items = user.calendars.map(function (calendarId) {
        return {id: calendarId};
      })
    }
    else {
      // default: just use the users own calendar
      items = [{id: email}];
    }

    var now = new Date();
    var defaultTimeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
        now.getHours(), Math.round(now.getMinutes() / 30) * 30, 0);
    var defaultTimeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

    var query = {
      timeMin: req.query.timeMin || defaultTimeMin.toISOString(),
      timeMax: req.query.timeMax || defaultTimeMax.toISOString(),
      items: items
    };

    gcal(accessToken).freebusy.query(query, function(err, data) {
      try {
        // merge the free busy intervals
        if (data && data.calendars) {
          var busy = Object.keys(data.calendars).reduce(function (busy, key) {
            return busy.concat(data.calendars[key].busy);
          }, []);
          data.busy = intervals.merge(busy);
          data.free = intervals.invert(data.busy, query.timeMin, query.timeMax);
        }
      }
      catch (error) {
        err = error;
      }

      if(err) return sendError(res, err);

      return res.json(data);
    });
  });
});

// TODO: remove this function
app.get('/freeBusy/:calendarId', function(req, res) {
  var accessToken     = req.session.accessToken;
  var calendarId      = req.params.calendarId;
  var now = new Date();
  var query = {
    timeMin: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
    timeMax: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString(),
    items: [
      {id: calendarId}
    ]
  };

  gcal(accessToken).freebusy.query(query, function(err, data) {
    if(err) return sendError(res, err);
    return res.json(data);
  });
});

/**
 * Send an error
 * @param {Object} res
 * @param {Error | string | Object} err
 */
function sendError(res, err) {
  var body;

  if (err instanceof Error) {
    body = err.toString();
  }
  else if (typeof err === 'string') {
    body = err;
  }
  else {
    body = JSON.stringify(err);
  }

  return res.status(500).send(body);
}

/**
 * Retrieve user information from google
 * @param {string} accessToken
 * @param {function} callback   called as `callback(err, user)`
 */
function getUserInfo (accessToken, callback) {
  var url = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + accessToken;
  request(url, function (error, response, body) {
    try {
      if (!error && body.length > 0) {
        var data = JSON.parse(body);
        callback(null, {
          loggedIn: true,
          name: data.name || null,
          email: data.email || null,
          picture: data.picture || null
        });
      }
    }
    catch (err) {
      callback(err, null);
    }
  });
}

/**
 * Retrieve a new access token from a given refreshToken
 * https://developers.google.com/accounts/docs/OAuth2WebServer#refresh
 * @param {String} refreshToken
 * @param {function(err, object)} callback   On success, the returned `object`
 *                                           contains parameters access_token,
 *                                           token_type, expires_in, and id_token
 */
function refreshAccessToken(refreshToken, callback) {
  var url = 'https://accounts.google.com/o/oauth2/token';
  var form = {
    refresh_token: refreshToken,
    client_id: config.GOOGLE_CLIENT_ID,
    client_secret: config.GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token'
  };

  request.post(url, {form: form}, function (error, response, body) {
    if (error) return callback(error, null);

    callback(null, JSON.parse(body));
  });
}
