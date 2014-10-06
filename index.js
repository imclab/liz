var util = require('util');
var request = require('request');
var express  = require('express');
var cookieParser  = require('cookie-parser');
var bodyParser  = require('body-parser');
var session = require('express-session');
var gcal = require('google-calendar');
var passport = require('passport');
var argv = require('yargs').argv;

var MongoStore = require('connect-mongo')(session);
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var PRODUCTION = (process.env.NODE_ENV == 'production');
var MONGO_URL = argv.MONGO_URL ||
    process.argv.MONGO_URL ||
    process.argv.MONGOHQ_URL ||
    'mongodb://127.0.0.1:27017/smartplanner/sessions';
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

var app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({
  store: new MongoStore({url: MONGO_URL, ssl: PRODUCTION}),
  secret: 'youre not going to guess this one',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());

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
      scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar']
    },
    function(accessToken, refreshToken, profile, done) {
      profile.accessToken = accessToken;
      return done(null, profile);
    }
));

app.get('/auth',
    passport.authenticate('google', { session: false }));

app.get('/auth/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/' }),
    function(req, res) {
      var redirectTo = req.session.redirectTo || '/';
      req.session.accessToken = req.user.accessToken;
      res.redirect(redirectTo);
    });

app.get('/user', function(req, res, next) {
  getUser(req.session, function (user) {
    res.header('content-type', 'application/json')
        .send(JSON.stringify(user));
  })
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

app.all('/calendar*', function(req, res, next) {
  if(!req.session.accessToken) {
    req.session.redirectTo = req.url;
    return res.redirect('/auth');
  }
  else {
    return next();
  }
});

app.get('/calendar', function(req, res){
  var accessToken = req.session.accessToken;

  gcal(accessToken).calendarList.list(function(err, data) {
    if(err) return res.status(500).send(err);
    return res.header('content-type', 'application/json')
        .send(data);
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
    return res.header('content-type', 'application/json')
        .send(data);
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
    return res.header('content-type', 'application/json')
        .send(data);
  });
});

/**
 * Retrieve user information
 * @param session
 * @param callback
 */
function getUser (session, callback) {
  var user = {
    loggedIn: session.accessToken != null,
    name: session.name || null,
    email: session.email || null
  };

  if (typeof user.name === 'string' && typeof user.email === 'string') {
    callback(user);
  }
  else {
    var accessToken = session.accessToken;
    if (accessToken) {
      var url = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + accessToken;
      request(url, function (error, response, body) {
        try {
          if (!error && body.length > 0) {
            var data = JSON.parse(body);
            session.name = data.name || '(unknown)';
            session.email = data.email || '(unknown)';
            user.name = session.name;
            user.email = session.email;
            callback(user);
          }
        }
        catch (err) {
          callback(null);
        }
      });
    }
    else {
      callback(user);
    }
  }
}
