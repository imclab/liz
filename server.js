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
      scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/contacts.readonly'
      ]
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

      var DAY = 24 * 60 * 60 * 1000;
      var maxAge = 14 * DAY; // 14 days
      req.session.cookie.expires = new Date(Date.now() + maxAge).toISOString();
      req.session.cookie.maxAge = maxAge;

      // store the auth in the users profile, so it can be used by others
      // to access your freeBusy profile
      updateUser({
        email: email,
        auth: {
          accessToken: req.user.auth.accessToken,
          refreshToken: req.user.auth.refreshToken,
          expires: new Date(Date.now() + expires_in).toISOString()
        }
      }, function (err) {
        if (err) sendError(res, err);

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
  if (!req.session.email) {
    req.session.redirectTo = req.url;
    return res.redirect('/auth');
  }
  else {
    return next();
  }
}

// retrieve user settings
// note: this call does not authorize the session, returns {loggedIn: false} when not logged in
app.get('/user', function(req, res, next) {
  var loggedIn = req.session.email != null;
  if (loggedIn) {
    var email = req.session.email;
    db.users.findOne({email: email}, function (err, user) {
      if(err) return res.status(500).send(err.toString());
      if (user == null) {
        // get user info from google
        getUserInfo(user.auth.accessToken, function (err, user) {
          if(err) return res.status(500).send(err.toString());

          // store user in the database
          updateUser(user, function (err, user) {
            if(err) return res.status(500).send(err.toString());
            return res.json(sanitizeUser(user));
          })
        });
      }
      else {
        user.loggedIn = true;
        return res.json(sanitizeUser(user));
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

  function destroySession() {
    req.session.destroy(function(err) {
      res.json('User ' + email + ' deleted');
    });
  }

  getUser(email, function (err, user) {
    if (err) return res.status(404).send('User not found');

    // remove the user from our database
    db.users.remove({email: email}, function (err, result) {
      var accessToken = user.auth && user.auth.accessToken;
      if (accessToken) {
        //revoke granted permissions at google
        var url = 'https://accounts.google.com/o/oauth2/revoke?token=' + accessToken;
        request(url, destroySession);
      }
      else {
        destroySession();
      }
    });
  });

});

app.all('/calendar*', auth);

app.get('/calendar', function(req, res){
  getAccessToken(req.session.email, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    gcal(accessToken).calendarList.list(function(err, data) {
      if(err) return sendError(res, err);
      return res.json(data);
    });
  });
});

app.get('/calendar/:calendarId?', function(req, res){
  var calendarId = req.params.calendarId || req.session.email;

  getAccessToken(calendarId, function (err, accessToken, user) {
    if(err) return sendError(res, err);

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
});

// insert a new event
app.put('/calendar/:calendarId', function(req, res){
  var calendarId = req.params.calendarId || req.session.email;
  var event = req.body;

  getAccessToken(calendarId, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    gcal(accessToken).events.insert(calendarId, event, function(err, createdEvent) {
      if(err) return sendError(res, err);
      return res.json(createdEvent);
    });
  });
});

app.delete('/calendar/:calendarId/:eventId/remove', function(req, res){
  var calendarId = req.params.calendarId;
  var eventId    = req.params.eventId;

  getAccessToken(calendarId, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    gcal(accessToken).events.delete(calendarId, eventId, function(err, data) {
      if(err) return sendError(res, err);
      return res.redirect('/calendar/'+calendarId);
    });
  });
});

app.get('/freeBusy*', auth);
app.get('/freeBusy/:calendarId?', function(req, res) {
  var email      = req.session.email;
  var calendarId = req.params.calendarId || email;

  getAccessToken(calendarId, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    var items;
    if (user && user.calendars) {
      items = user.calendars.map(function (calendarId) {
        return {id: calendarId};
      })
    }
    else {
      // default: just use the users own calendar
      items = [{id: calendarId}];
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

    if (!user.auth || !user.auth.accessToken) {
      return sendError(res, new Error('Unauthorized or non existing calendar'), 403);
    }

    gcal(user.auth.accessToken).freebusy.query(query, function(err, data) {
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

app.get('/contacts*', auth);
app.get('/contacts/:email?', function(req, res){
  var email = req.params.email || req.session.email;

  getAccessToken(email, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    getContacts(email, accessToken, function (err, contacts) {
      if(err) return sendError(res, err);
      return res.json(contacts);
    });
  });
});

/**
 * Send an error
 * @param {Object} res
 * @param {Error | string | Object} err
 * @param {number} [status=500]
 */
function sendError(res, err, status) {
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
 * Remove internal data from a user object
 * @param {Object} user
 * @returns {Object} Returns the sanitized user
 */
function sanitizeUser(user) {
  delete user.auth; // remove authentication data
  delete user.seq;
  delete user.updated;
  delete user._id;
  return user;
}

function getUser(email, callback) {
  db.users.findOne({
    query: {email: email}
  }, function (err, user) {
    if (err) return callback(err, null);

    // check whether the accessToken is expired. If so, get a new one
    if (user) {
      if (user.auth && user.auth.expires &&
          new Date(user.auth.expires) < (Date.now() + 5 * 60 * 1000)) {
        // access token expires within 5 minutes, get a new one
        console.log('refreshing accessToken of user ' + email + '...'); // TODO: cleanup

        refreshAccessToken(user.auth.refreshToken, function (err, result) {
          if (err) return callback(err, null);
console.log('refreshed access token', result)
          // store the new accessToken and refreshToken in the user's profile
          updateUser({
            email: user.email,
            auth: {
              accessToken: result.access_token,
              refreshToken: result.refresh_token,
              expires: new Date(Date.now() + result.expires_in).toISOString()
            }
          }, callback);
        });
      }
      else {
        callback(null, user);
      }
    }
    else {
      callback(new Error('User not found'), null);
    }
  });
}

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

/**
 * Get access token for an email. token is read from the users profile
 * @param {string} email
 * @param {function (Error, string, Object)} callback
 *            called as `callback(err, accessToken, user)`
 */
function getAccessToken(email, callback) {
  getUser(email, function (err, user) {
    if (err) return callback(err, null, null);

    var accessToken = user.auth && user.auth.accessToken;
    if (!accessToken) return callback(new Error('No valid access token'), null, null);

    // TODO: authorize this access

    return callback(null, accessToken, user);
  });
}

/**
 * Retrieve user information from google
 * @param {string} accessToken
 * // TODO: add scope here, with
 * @param {function} callback   called as `callback(err, user)`
 */
function getUserInfo (accessToken, callback) {
  var url = 'https://www.googleapis.com/oauth2/v1/userinfo' +
      '?access_token=' + accessToken;
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
 * Retrieve a users contacts from google
 * @param {string} email
 * @param {string} accessToken
 * @param {function} callback   called as `callback(err, contacts)`
 */
function getContacts (email, accessToken, callback) {
  var url = 'https://www.google.com/m8/feeds/contacts/' + email + '/full' +
      '?alt=json&max-results=9999&access_token=' + accessToken;
  request(url, function (error, response, body) {
    try {
      if (!error && body.length > 0) {
        var data = JSON.parse(body);
        var contacts = {};
        data.feed.entry && data.feed.entry.forEach(function (entry) {
          entry.gd$email.forEach(function (email) {
            contacts[email.address] = entry.title.$t;
          });
        });

        callback(null, contacts);
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
 * @param {function(Error, object)} callback   On success, the returned `object`
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
