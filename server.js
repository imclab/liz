var request = require('request');
var express  = require('express');
var moment = require('moment');
var cookieParser  = require('cookie-parser');
var bodyParser  = require('body-parser');
var session = require('express-session');
var gcal = require('google-calendar');
var passport = require('passport');
var MongoStore = require('connect-mongo')(session);
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var _ = require('lodash');
var async = require('async');
var UUID = require('uuid-v4.js');

var config = require('./config');
var gutils = require('./lib/google-utils');
var intervals = require('./shared/intervals');
var authorization = require('./lib/authorization');

// create a connection to mongodb
var db = require('./lib/db')(config.MONGO_URL + '/' + config.MONGO_DB);

// create an express app
var app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({
  //store: new MongoStore({url: MONGO_URL + '/' + MONGO_DB + '/sessions', ssl: PRODUCTION}), // TODO: use SSL
  store: new MongoStore({
    url: config.MONGO_URL + '/' + config.MONGO_DB + '/sessions',
    stringify: false,
    auto_reconnect: true
  }),
  secret: 'youre not going to guess this one',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());

// serve static content
app.use('/', express.static(__dirname + '/client'));
app.use('/node_modules/', express.static(__dirname + '/node_modules'));
app.use('/shared/', express.static(__dirname + '/shared'));
app.use('/fonts/', express.static(__dirname + '/node_modules/bootflat/fonts'));

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
      db.users.update({
        email: email,
        auth: {
          accessToken: req.user.auth.accessToken,
          refreshToken: req.user.auth.refreshToken,
          expires: new Date(Date.now() + expires_in).toISOString()
        }
      }, function (err, user) {
        if (err) sendError(res, err);

        function done() {
          var redirectTo = req.session.redirectTo || '/';
          res.redirect(redirectTo);
        }

        // TODO: move this code to db?
        // add user information like name and picture to the user object
        if (user.name == null) {
          // get user info from google
          console.log('retrieving user info for ' + email+ '...');
          gutils.getUserInfo(user.auth.accessToken, function (err, userData) {
            if(err) return sendError(res, err);

            // initialize some default settings when missing
            if (user.share == undefined) {
              // add field with default permissions
              userData.share = 'calendar'; // 'me', 'calendar', 'contacts'
            }

            // store user in the database
            db.users.update(userData, function (err, user) {
              if(err) return sendError(res, err);
              done();
            })
          });
        }
        else {
          done();
        }
      });
    });

app.get('/auth/signin', function(req, res, next) {
  req.session.redirectTo = req.query.redirectTo || '/';
  return res.redirect('/auth');
});

app.get('/auth/signout', function(req, res, next) {
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
    db.users.get(email, function (err, user) {
      if(err) return sendError(res, err);

      if (user) {
        // sanitize the user object before sending it to the client
        user.loggedIn = true;
        delete user.auth; // remove authentication data
        delete user.seq;
        delete user.updated;
        delete user._id;
        return res.json(user);
      }
      else {
        // logged in but no user profile
        return res.json({loggedIn: false});
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

    db.users.update(user, function (err, user) {
      if(err) return sendError(res, err);
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

  db.users.get(email, function (err, user) {
    if (err) return res.status(404).send('User not found');

    // remove the user
    db.users.remove(email, function (err, result) {
      // remove the users profiles
      db.profiles.removeAll(email, function (err, profiles) {

        //revoke granted permissions at google
        var accessToken = user.auth && user.auth.accessToken;
        if (accessToken) {
          var url = 'https://accounts.google.com/o/oauth2/revoke?token=' + accessToken;
          request(url, destroySession);
        }
        else {
          destroySession();
        }
      });
    });
  });

});

app.all('/calendar*', auth);

app.get('/calendar', function(req, res){
  authorize(req.session.email, req.session.email, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    gcal(accessToken).calendarList.list(function(err, data) {
      if(err) return sendError(res, err);
      return res.json(data);
    });
  });
});

// Get all calendar events
app.get('/calendar/:calendarId', function(req, res){
  var calendarId = req.params.calendarId || req.session.email;

  // only user itself has access here
  // TODO: this is a hacky solution, authorization module with a certain scope for this
  if (calendarId != req.session.email) {
    return sendError(res, new Error('Unauthorized'));
  }

  authorize(req.session.email, calendarId, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    var now = new Date();
    var defaultTimeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
        now.getHours(), Math.round(now.getMinutes() / 30) * 30, 0);
    var defaultTimeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);

    var options = {
      singleEvents: true, // expand recurring events
      orderBy: 'startTime',
      timeMin: req.query.timeMin || defaultTimeMin.toISOString(),
      timeMax: req.query.timeMax || defaultTimeMax.toISOString()
    };

    gcal(accessToken).events.list(calendarId, options, function(err, data) {
      // TODO: filter availability events from the list
      if(err) return sendError(res, err);
      return res.json(data);
    });
  });
});

// Get a calendar event by it's id
app.get('/calendar/:calendarId/:eventId', function(req, res){
  var calendarId = req.params.calendarId || req.session.email;
  var eventId = req.params.eventId;

  // only user itself has access here
  // TODO: this is a hacky solution, authorization module with a certain scope for this
  if (calendarId != req.session.email) {
    return sendError(res, new Error('Unauthorized'));
  }

  authorize(req.session.email, calendarId, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    var options = {};
    gcal(accessToken).events.get(calendarId, eventId, options, function(err, data) {
      // TODO: filter availability events from the list
      if(err) return sendError(res, err);
      return res.json(data);
    });
  });
});

// insert a new event
app.put('/calendar/:calendarId', function(req, res){
  var calendarId = req.params.calendarId || req.session.email;
  var event = req.body;

  authorize(req.session.email, calendarId, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    // replace group attendees with free group members
    chooseGroupMembers(event, function (err, event) {
      if(err) return sendError(res, err);

      gcal(accessToken).events.insert(calendarId, event, function(err, createdEvent) {
        if(err) return sendError(res, err);
        return res.json(createdEvent);
      });
    });
  });
});

app.delete('/calendar/:calendarId/:eventId', function(req, res){
  var calendarId = req.params.calendarId;
  var eventId    = req.params.eventId;

  authorize(req.session.email, calendarId, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    gcal(accessToken).events.delete(calendarId, eventId, function(err, result) {
      if(err) return sendError(res, err);
      return res.json(result);
    });
  });
});

app.get('/freeBusy*', auth);
app.get('/freeBusy/:calendarId?', function(req, res) {
  var email = req.session.email;
  var calendarIds = req.params.calendarId ? [req.params.calendarId] :
      req.query.calendars ? splitIt(req.query.calendars) : [email];

  var now = new Date();
  var defaultTimeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
      now.getHours(), Math.round(now.getMinutes() / 30) * 30, 0);
  var defaultTimeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
  var query = {
    singleEvents: true, // expand recurring events
    orderBy: 'startTime',
    timeMin: req.query.timeMin || defaultTimeMin.toISOString(),
    timeMax: req.query.timeMax || defaultTimeMax.toISOString()
  };

  // retrieve the free/busy profiles of each of the selected calendars and groups
  async.map(calendarIds, function (calendarId, callback) {
    var group;

    if (calendarId.substr(0, 6) == 'group:') {
      group = calendarId.substr(6);
      getGroupFreeBusy(group, query, function (err, profile) {
        if (profile) profile.id = group;
        callback(err, profile);
      });
    }
    else { // email
      group = req.query.group || null;
      getAuthFreeBusy(email, group, calendarId, query, function (err, profile) {
        if (profile) profile.id = calendarId;
        callback(err, profile);
      });
    }
  }, function (err, profilesArray) {
    // merge the array with free/busy profiles objects
    var profiles = profilesArray.reduce(function (profiles, value) {
      profiles[value.id] = value;
      return profiles;
    }, {});

    // merge the busy intervals and return them
    var merged = gutils.mergeBusy(profiles, query);

    merged.errors = Object.keys(profiles).reduce(function (errors, calendarId) {
      var profile = profiles[calendarId];
      if (profile.errors && profile.errors.length > 0) {
        profile.errors.forEach(function (err) {
          errors.push({
            id: calendarId,
            message: err
          });
        });
      }
      return errors;
    }, []);

    return res.json(merged);
  });
});

app.get('/contacts*', auth);
app.get('/contacts/:email?', function(req, res){
  var email = req.params.email || req.session.email;
  var raw = req.query.raw == '' || req.query.raw == 'true';
  var query = req.query.query || '';

  // only user itself has access here
  // TODO: this is a hacky solution, authorization module with a certain scope for this
  if (email != req.session.email) {
    return sendError(res, new Error('Unauthorized'));
  }

  authorize(req.session.email, email, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    gutils.getContacts(email, accessToken, query, function (err, googleContacts) {
      if(err) return sendError(res, err);

      var contacts = raw ? googleContacts : gutils.contactsToArray(googleContacts);
      return res.json(contacts);
    });
  });
});


app.get('/groups*', auth);

// get all groups (aggregated from all user profiles having role=='group')
app.get('/groups', function(req, res){
  var options = req.query;
  db.groups.list(options, function (err, groups) {
    if (err) return sendError(res, err);
    return res.json(groups);
  });
});


app.get('/profiles*', auth);

// get all profiles of current user
app.get('/profiles', function(req, res){
  var userId = req.session.email;

  db.profiles.list(userId, function (err, profiles) {
    if (err) return sendError(res, err);
    return res.json(profiles);
  });
});

// create or update a profile of a user
app.put('/profiles', function(req, res){
  var userId = req.session.email;
  var profile = req.body;
  if (profile.user == undefined) {
    profile.user = userId;
  }
  else if (profile.user != userId) {
    return sendError(res, new Error('Cannot update a profile of an other user'));
  }

  db.profiles.update(profile, function (err, profiles) {
    if (err) return sendError(res, err);
    return res.json(profiles);
  });
});

// delete a profile
app.delete('/profiles/:id', function(req, res){
  db.profiles.remove(req.params.id, function (err, profiles) {
    if (err) return sendError(res, err);
    return res.json(profiles);
  });
});

// get pending profiles
app.get('/profiles/pending', function (req, res) {
  var userId = req.session.email;

  db.profiles.pending(userId, function (err, profiles) {
    if (err) return sendError(res, err);
    return res.json(profiles);
  });
});

// grant access pending profiles
app.post('/profiles/grant', function (req, res) {
  var userId = req.session.email;
  var profile = req.body;

  db.profiles.grant(profile.group, userId, profile.user, profile.access, function (err, result) {
    if (err) return sendError(res, err);
    return res.json(result);
  });
});

// generate availability events
app.post('/profiles/generate', function (req, res) {
  var email = req.session.email;
  var calendarId = req.body.calendar || email;

  authorize(email, email, function (err, accessToken, user) {
    if(err) return sendError(res, err);

    // get timeZone of the selected calendar
    gutils.getTimeZone(calendarId, accessToken, function (err, timeZone) {
      if (err) return sendError(res, err);

      // generate events from the given profile
      gutils.generateAvailabilityEvents(req.body, timeZone, function (err, events) {
        if (err) return sendError(res, err);

        // create the events in the calendar
        async.map(events, function (event, callback) {
          gcal(accessToken).events.insert(calendarId, event, callback);
        }, function (err, createdEvents) {
          if(err) return sendError(res, err);
          return res.json(createdEvents);
        });
      });

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
  var body = stringifyError(err);

  if (!status) {
    var _body = body.toLowerCase();
    if (_body.indexOf('authorized') != -1)      {status = 403;}
    else if (_body.indexOf('not found') != -1)  {status = 404;}
    else status = 500;
  }

  return res.status(status).send(body);
}

/**
 * Stringify an error
 * @param {Error | string | Object} err
 * @returns {string} message
 */
function stringifyError(err) {
  if (err instanceof Error) {
    return err.toString();
  }
  else if (typeof err === 'string') {
    return err;
  }
  else {
    return JSON.stringify(err);
  }
}

/**
 * Get the free busy profile of a user by it's email (will authorize)
 * @param {string} email                The email of the logged in user
 * @param {string} [group=undefined]    Group for which to return the availability.
 *                                      If not provided, the profile of the user
 *                                      with role=='individual' is used
 * @param {string} calendarId           A calendar id
 * @param {{timeMin: string, timeMax: string}} query
 * @param {function} callback     Called as callback(err, {free: Array, busy:Array, errors:Array})
 *                                `err` is null
 */
function getAuthFreeBusy(email, group, calendarId, query, callback) {
  authorize(email, calendarId, function (err, accessToken, user) {
    if (err) {
      // this user of `calendarId` does not exist. Try to get the freebusy profile via the logged in user
      var profilesError = createProfileError(err);

      db.users.getAuthenticated(email, function (err2, loggedInUser) {
        if (loggedInUser) {
          return getFreeBusyVia(loggedInUser, calendarId, query, function (err, profile) {
            if (profile && profile.errors && profile.errors.length > 0) {
              // return the original error
              return callback(null, profilesError);
            }

            return callback(null, profile)
          });
        }
        else {
          // return the original error
          return callback(null, profilesError);
        }
      });
    }
    else {
      // this user exists. get the freebusy profile
      getFreeBusy(user, group, query, callback);
    }
  });
}

/**
 * Get the freeBusy profile of a Group. The freeBusy profiles of all
 * group members will be retrieved and merged.
 * @param {string} groupName                          A group name like "Consultant"
 * @param {{timeMin: string, timeMax: string}} query  Object with start and end time
 * @param {function} callback     Called as callback(err, {busy:Array, errors:Array})
 *                                `err` is null
 */
function getGroupFreeBusy(groupName, query, callback) {
  // get the members of this group
  db.groups.getByName(groupName, function (err, group) {
    if (err) return callback(null, createProfileError(err));

    // get the freeBusy profiles of each of the group members
    async.map(group.members, function (member, callback) {
      // Note: we do NOT authorize individual members, here...
      db.users.getAuthenticated(member, function (err, user) {
        // ignore failed members
        // TODO: return group member errors as non-critical errors or warnings?
        if (err) console.log('Error getting group member', member , err);
        if (err) return callback(null, {free: [], busy: []});

        getFreeBusy(user, groupName, query, callback);
      });
    }, function (err, profilesArray) {
      // merge the array with profile objects
      var all = profilesArray.reduce(function (all, value, key) {
        all[key] = value;
        return all;
      }, {});

      // merge the free intervals
      var merged = gutils.mergeFree(all, query);
      merged.errors = gutils.mergeErrors(all);

      return callback(null, merged);
    });
  });
}

/**
 * Get the free busy profile of a user in a certain role (team member or individual)
 * @param {Object} user
 * @param {string} [group=undefined]  Group for which to get the users busy profile
 *                                    If not provided, the profile of the user
 *                                    with role=='individual' is used
 * @param {{timeMin: string, timeMax: string}} query
 * @param {function} callback     Called as callback(err, {free: Array, busy:Array, errors:Array})
 *                                `err` is null
 */
function getFreeBusy(user, group, query, callback) {
  // get all profiles of this user
  db.profiles.list(user.email, function (err, profiles) {
    if (err) return callback(null, createProfileError(err));

    // get all calendars
    var calendarIds;
    if (profiles.length > 0) {
      calendarIds = profiles.reduce(function (calendarIds, profile) {
        if (profile.calendars != undefined) {
          var cals = profile.calendars.split(',').map(function (cal) {
            return cal.trim();
          });
          calendarIds = calendarIds.concat(cals);
        }

        return calendarIds;
      }, []);
      calendarIds = _.uniq(calendarIds); // remove duplicates
    }
    else {
      // use default calendar if no profiles are specified
      calendarIds = [user.email];
    }

    // add (override!) the calendar ids to the google calendar request query
    var _query = _.extend({
      singleEvents: true, // expand recurring events
      orderBy: 'startTime'
    }, query);
    _query.items = calendarIds.map(function (calendarId) {
      return {id: calendarId};
    });

    // create an array with all tags, and one with all tags belonging to the specified group
    var allTags = getTags(profiles);
    var filteredTags = getTags(profiles.filter(function (profile) {
      return (group == undefined) ?
          (profile.role != 'group') :
          (profile.role == 'group' && profile.group == group);
    }));

    // read events for each of the calendars
    async.map(calendarIds, function (calendarId, cb) {
      gcal(user.auth.accessToken).events.list(calendarId, _query, cb);
    }, function (err, allResults) {
      if (err) return callback(err, null);

      // merge the results from different calendars into one list
      var events = allResults.reduce(function (events, results) {
        return events.concat(results.items || []);
      }, []);

      // merge the events into a freebusy profile and return that
      var freebusy = mergeEvents(events, _query, allTags, filteredTags);

      return callback(null, freebusy);
    });
  });
}

/**
 * Get the free busy profile of a user via another users google calendar.
 * This will not reckon with an availability profile.
 * @param {Object} user
 * @param {string} calendarId
 * @param {{timeMin: string, timeMax: string}} query
 * @param {function} callback     Called as callback(err, {free: Array, busy:Array, errors:Array})
 *                                `err` is null
 */
function getFreeBusyVia(user, calendarId, query, callback) {
  // add (override!) the calendar ids to the google calendar request query
  var _query = _.extend({
    singleEvents: true, // expand recurring events
    orderBy: 'startTime'
  }, query);
  _query.items = [
    {id: calendarId}
  ];

  gcal(user.auth.accessToken).events.list(calendarId, _query, function (err, results) {
    if (err) return callback(null, createProfileError(err));

    // merge the events into a freebusy profile and return that
    var events = results.items;
    var allTags = [];
    var filteredTags = [];
    var freebusy = mergeEvents(events, _query, allTags, filteredTags);

    return callback(null, freebusy);
  });
}

/**
 * Merge an Array with events into a freebusy profile
 * @param {Array} events Raw list with google calendar events
 * @param {{timeMin: string, timeMax: string}} query
 * @param {string[]} allTags
 * @param {string[]} filteredTags
 * @returns {{free: *, busy: Array.<Object>, errors: Array}}
 */
function mergeEvents(events, query, allTags, filteredTags) {
  var notAvailable = []; // intervals from events of the user (busy)
  var available = [];    // intervals from availability tags of this user

  events.forEach(function (event) {
    // ignore all day events
    // FIXME: do not ignore all day events? or make that customizable? Or introduce a "#ignore" tag or something?
    if (event.start.dateTime !== undefined && event.end.dateTime !== undefined) {
      // create interval, normalize start and end into an ISO date string
      var interval = {
        start: moment(event.start.dateTime || event.start.date).toISOString(),
        end:   moment(event.end.dateTime   || event.end.date).toISOString()
      };
      var summary = event.summary.toLowerCase();

      if (allTags.indexOf(summary) == -1) {
        // this is a regular event (user is busy)
        // TODO: check whether this item is marked as busy or as available (is there a field for that in the returned calendar items?)
        notAvailable.push(interval);
      }
      else if (filteredTags.indexOf(summary) != -1) {
        // this is an availability event, it has an availability tag as title
        available.push(interval);
      }
    }
  });

  if (filteredTags.length === 0) {
    // mark as available the whole interval if there is no availability profile configured
    available.push({
      start: query.timeMin,
      end: query.timeMax
    });
  }

  // merge intervals
  var inverted = intervals.invert(intervals.merge(available), query.timeMin, query.timeMax);
  var busy     = intervals.merge(inverted.concat(notAvailable));
  var free     = intervals.invert(busy, query.timeMin, query.timeMax);

  // return a freebusy profile
  return {
    free: free,
    busy: busy,
    errors: []
  };
}

/**
 * Get a free group member
 * @param {string} groupName                           A group name like "Consultant"
 * @param {{timeMin: string, timeMax: string}} query   Time interval
 * @param {function} callback   Called as callback(err, memberIds: string[])
 */
function getFreeGroupMembers(groupName, query, callback) {
  db.groups.getByName(groupName, function (err, group) {
    if (err) return callback(err, null);

    async.filter(group.members, function (member, callback) {
      db.users.getAuthenticated(member, function (err, user) {
        // ignore failed members
        // TODO: return group member errors as non-critical errors or warnings?
        if (err) console.log('Error getting group member', member, err);

        if (!user) return callback(false);

        getFreeBusy(user, groupName, query, function (err, profile) {
          return callback(profile.free.some(function (free) {
            return (free.start <= query.timeMin && free.end >= query.timeMax);
          }));
        });
      });
    }, function (freeMembers) {
      callback(null, freeMembers);
    });
  });
}

/**
 * Replace groups in the attendees of an event with a group member which is
 * available. Replacements are done in the original event.
 * @param {Object} event          A google calendar event, must contain property
 *                                `attendees: [{id: string}]`
 * @param {function} callback     Called as callback(err, event), where
 *                                the attendees containing a group are replaced
 *                                with a free group member
 */
function chooseGroupMembers(event, callback) {
  var query = {
    timeMin: event.start.dateTime,
    timeMax: event.end.dateTime
  };

  async.each(event.attendees, function (attendee, callback) {
    if (attendee.email.substr(0, 6) == 'group:') {
      var group = attendee.email.substr(6);
      getFreeGroupMembers(group, query, function (err, members) {
        if (err) return callback(err);

        if (members.length == 0) {
          return callback(new Error('No free group member found'));
        }

        // TODO: be able to use various strategies for choosing one the available members
        attendee.email = members[0];
        return callback();
      });
    }
    else {
      callback();
    }
  }, function (err) {
    err ? callback(err, null) : callback(null, event);
  });
}

/**
 * Get an array with all merged tags found in an array with profiles
 * @param {Array} profiles
 * @returns {Array.<string>} Returns an array with lower case tags
 */
function getTags(profiles) {
  var tags = profiles.reduce(function (tags, profile) {
    if (profile.tag != undefined) {
      tags.push(profile.tag.toLowerCase());
    }
    return tags;
  }, []);

  // remove duplicates
  return _.uniq(tags);
}

/**
 * Build an error object. Returned object has the structure:
 *
 *     {
 *       free: [],
 *       busy: [],
 *       errors: [message]
 *     }
 *
 * @param {Error} err
 * @returns {Object}
 */
function createProfileError(err) {
  return {
    free: [],
    busy: [],
    errors: [stringifyError(err)]
  };
}

/**
 * Authorize access to a users calendar
 * @param {string} requester    The one wanting access
 * @param {string} email        The one to which the requester wants access
 * // TODO: introduce scope @param {string} scope        Scope of the access. Choose 'busy' or 'full'
 * @param {function (Error, string, Object)} callback
 *            called as `callback(err, accessToken, user)`
 */
function authorize (requester, email, callback) {
  db.users.getAuthenticated(email, function (err, user) {
    if (err) return callback(err, null, null);

    authorization.authorize(requester, user, callback);
  });
}

/**
 * Split a string
 * @param {string} text
 * @param {string} [delimiter=',']
 * @return {Array.string} Returns splitted and trimmed entries
 */
function splitIt(text, delimiter) {
  return text.split(delimiter || ',').map(function (calendar) {
    return calendar.trim();
  });
}
