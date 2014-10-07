var util = require('util');
var request = require('request');
var express  = require('express');
var cookieParser  = require('cookie-parser');
var bodyParser  = require('body-parser');
var session = require('express-session');
var gcal = require('google-calendar');
var passport = require('passport');
var argv = require('yargs').argv;
var mongojs = require('mongojs');

var MongoStore = require('connect-mongo')(session);
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var PRODUCTION = (process.env.NODE_ENV == 'production');
var MONGO_URL = argv.MONGO_URL ||
    process.env.MONGO_URL ||
    process.env.MONGOHQ_URL ||
    'mongodb://127.0.0.1:27017';
var MONGO_DB = 'smartplanner';
var GOOGLE_CLIENT_ID = argv.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
var GOOGLE_CLIENT_SECRET = argv.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
var PORT = argv.PORT || process.env.PORT || 8082;
var CALLBACK_URL = PRODUCTION ?
    'https://smartplanner.herokuapp.com/auth/callback' :
    'http://localhost:' + PORT + '/auth/callback';

if (!GOOGLE_CLIENT_ID) {
  throw new Error('No GOOGLE_CLIENT_ID configured. Provide a GOOGLE_CLIENT_ID via command line arguments or an environment variable');
}
if (!GOOGLE_CLIENT_SECRET) {
  throw new Error('No GOOGLE_CLIENT_SECRET configured. Provide a GOOGLE_CLIENT_SECRET via command line arguments or an environment variable');
}

console.log('MONGO_URL (or MONGOHQ_URL):', MONGO_URL);
console.log('Authentication callback url:', CALLBACK_URL);

// create an express app
var app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({
  //store: new MongoStore({url: MONGO_URL + '/' + MONGO_DB + '/sessions', ssl: PRODUCTION}), // TODO: use SSL
  store: new MongoStore({url: MONGO_URL + '/' + MONGO_DB + '/sessions'}),
  secret: 'youre not going to guess this one',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());

// create a connection to mongodb
var db = mongojs(MONGO_URL + '/' + MONGO_DB, ['users', 'sessions']);

// serve static content
app.use('/', express.static(__dirname + '/client'));
app.use('/node_modules/', express.static(__dirname + '/node_modules'));

app.listen(PORT);
console.log('Server listening at http://localhost:' + PORT);

// Setup passportjs server for authentication
passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
      scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar'],
      accessType: 'offline',
      approvalPrompt: 'force'
    },
    function(accessToken, refreshToken, profile, done) {
      profile.accessToken = accessToken;
      return done(null, profile);
    }
));

app.get('/auth',
    passport.authenticate('google', { session: false }));
// TODO: if auth token was not valid, logout

app.get('/auth/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/' }),
    function(req, res) {
      var redirectTo = req.session.redirectTo || '/';
      req.session.accessToken = req.user.accessToken;
      req.session.email = req.user._json.email;
      res.redirect(redirectTo);
    });

app.get('/user/login', function(req, res, next) {
  req.session.redirectTo = '/';
  return res.redirect('/auth');
});

app.get('/user/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    res.redirect('/');
  })
});

function auth(req, res, next) {
  if(!req.session.accessToken) {
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
  var loggedIn = req.session.accessToken != null;
  if (loggedIn) {
    var email = req.session.email;
    db.users.findOne({email: email}, function (err, docs) {
      if(err) return res.status(500).send(err);
      if (docs == null) {
        getUserInfo(req.session.accessToken, function (err, user) {
          if(err) return res.status(500).send(err);

          // store user in the database
          updateUser(user, function (err, user) {
            if(err) return res.status(500).send(err);
            return res.json(user);
          })
        });
      }
      else {
        docs.loggedIn = true;
        return res.json(docs);
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
      if(err) return res.status(500).send(err);
      return res.json(user);
    });
  }
  else {
    return res.status(403).send('Not logged in');
  }
});

function updateUser(user, callback) {
  user.updated = new Date().toISOString();

  db.users.findAndModify({
    query: {email: user.email},
    update: {$set: user, $inc: {seq: 1}},
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
    if(err) return res.status(500).send(err);
    return res.json(data);
  });
});

app.get('/calendar/:calendarId', function(req, res){
  var accessToken     = req.session.accessToken;
  var calendarId      = req.params.calendarId;
  var now = new Date();
  var options = {
    singleEvents: true, // expand recurring events
    orderBy: 'startTime',
    timeMin: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
    timeMax: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString()
  };

  gcal(accessToken).events.list(calendarId, options, function(err, data) {
    if(err) return res.status(500).send(err);
    return res.json(data);
  });
});

app.get('/calendar/:calendarId/add', function(req, res){
  var accessToken     = req.session.accessToken;
  var calendarId      = req.params.calendarId;
  var text            = req.query.text || 'Hello World';

  gcal(accessToken).events.quickAdd(calendarId, text, function(err, data) {
    if(err) return res.status(500).send(err);
    return res.redirect('/calendar/'+calendarId);
  });
});

app.delete('/calendar/:calendarId/:eventId/remove', function(req, res){
  var accessToken     = req.session.accessToken;
  var calendarId      = req.params.calendarId;
  var eventId         = req.params.eventId;

  gcal(accessToken).events.delete(calendarId, eventId, function(err, data) {
    if(err) return res.status(500).send(err);
    return res.redirect('/calendar/'+calendarId);
  });
});

app.get('/freeBusy/:calendarId', function(req, res) {
  // TODO: get freeBusy for a list with calendars
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
    if(err) return res.status(500).send(err);
    return res.json(data);
  });
});

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
