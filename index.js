var util = require('util');
var request = require('request');
var express  = require('express');
var cookieParser  = require('cookie-parser');
var bodyParser  = require('body-parser');
var session = require('express-session');
var gcal = require('google-calendar');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

try {
  var config = require('./config');
}
catch (err) {
  console.log('Error: config.json missing.');
  console.log('Create a file config.json in the root of the project with the following contents:');
  console.log('{\n' +
    '  "client_id": CLIENT_ID,\n' +
    '  "client_secret" : CLIENT_SECRET\n' +
  '}');
  process.exit();
}
var PORT = config.port || 8082;

var app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({
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
      clientID: config.client_id,
      clientSecret: config.client_secret,
      callbackURL: "http://localhost:8082/auth/callback",
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
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    function(req, res) {
      var redirectTo = req.session.redirectTo || '/';
      req.session.access_token = req.user.accessToken;
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
  if(!req.session.access_token) {
    req.session.redirectTo = req.url;
    return res.redirect('/auth');
  }
  else {
    return next();
  }
});

app.all('/calendar', function(req, res){
  var accessToken = req.session.access_token;

  gcal(accessToken).calendarList.list(function(err, data) {
    if(err) return res.status(500).send(err);
    return res.header('content-type', 'application/json')
        .send(data);
  });
});

app.all('/calendar/:calendarId', function(req, res){
  var accessToken     = req.session.access_token;
  var calendarId      = req.params.calendarId;
  var now = new Date();
  var options = {
    timeMin: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
    timeMax: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString()
  };

  gcal(accessToken).events.list(calendarId, options, function(err, data) {
    if(err) return res.status(500).send(err);
    return res.header('content-type', 'application/json')
        .send(data);
  });
});

app.all('/calendar/:calendarId/add', function(req, res){
  var accessToken     = req.session.access_token;
  var calendarId      = req.params.calendarId;
  var text            = req.query.text || 'Hello World';

  gcal(accessToken).events.quickAdd(calendarId, text, function(err, data) {
    if(err) return res.status(500).send(err);
    return res.redirect('/calendar/'+calendarId);
  });
});

app.all('/calendar/:calendarId/:eventId/remove', function(req, res){
  var accessToken     = req.session.access_token;
  var calendarId      = req.params.calendarId;
  var eventId         = req.params.eventId;

  gcal(accessToken).events.delete(calendarId, eventId, function(err, data) {
    if(err) return res.status(500).send(err);
    return res.redirect('/calendar/'+calendarId);
  });
});

/**
 * Retrieve user information
 * @param session
 * @param callback
 */
function getUser (session, callback) {
  var user = {
    loggedIn: session.access_token != null,
    name: session.name || null,
    email: session.email || null
  };

  if (typeof user.name === 'string' && typeof user.email === 'string') {
    callback(user);
  }
  else {
    var access_token = session.access_token;
    if (access_token) {
      var url = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + access_token;
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
