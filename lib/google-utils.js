var request = require('request');
var moment = require('moment');
var _ = require('lodash');
var gcal = require('google-calendar');
var config = require('../config');
var intervals = require('../shared/intervals');

/**
 * Retrieve user information from google
 * @param {string} accessToken
 * // TODO: add scope here, with
 * @param {function} callback   called as `callback(err, user)`
 */
exports.getUserInfo = function(accessToken, callback) {
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
};

/**
 * Retrieve a users contacts from google
 * @param {string} email
 * @param {string} accessToken
 * @param {string} query
 * @param {function} callback   called as `callback(err, contacts)`
 */
exports.getContacts = function(email, accessToken, query, callback) {
  var url = 'https://www.google.com/m8/feeds/contacts/' + email + '/full' +
      '?alt=json&q=' + query + '&max-results=9999&access_token=' + accessToken;
  // FIXME: query does not do anything
  request(url, function (error, response, body) {
    try {
      if (!error && body.length > 0) {
        callback(null, JSON.parse(body));
      }
    }
    catch (err) {
      callback(err, null);
    }
  });
};

/**
 * Simplify "raw" google contacts returned by the Google Calendar API into a
 * simple array with contact names/emails.
 * @param {{feed: {entry: Array.<Object>}}} googleContacts
 * @returns {Array.<{name: string, email: string}>} Returns an array with simple contacts
 */
exports.contactsToArray = function(googleContacts) {
  var contacts = [];

  googleContacts.feed.entry && googleContacts.feed.entry.forEach(function (contact) {
        contact.gd$email && contact.gd$email.forEach(function (email) {
          contacts.push({
            name: contact.title.$t || null,
            email: email.address
          });
        });
      });

  return contacts;
};

/**
 * Merge an object with freeBusy profiles of calendars.
 * The busy intervals will be merged.
 * @param {Object.<string, {busy: Array.<{start: string, end: string}>, error: Array.<string>}>} calendars
 * @param {{timeMin: string, timeMax: string}} query
 * @returns {Object} Returns an object with merged free and busy profiles:
 *                   {
 *                     free: {start: string, end: string},
 *                     busy: {start: string, end: string}
 *                   }
 */
exports.mergeBusy = function(calendars, query) {
  // merge the busy intervals
  var allBusy = Object.keys(calendars).reduce(function (allBusy, calendarId) {
    var entry = calendars[calendarId];
    var busy = entry.busy || [];
    return allBusy.concat(busy);
  }, []);
  var busy = intervals.merge(allBusy);
  var free = intervals.invert(busy, query.timeMin, query.timeMax);

  return {
    free: free,
    busy: busy
  };
};

/**
 * Merge an object with freeBusy profiles of calendars.
 * The free intervals will be merged
 * @param {Object.<string, {busy: Array.<{start: string, end: string}>, error: Array.<string>}>} calendars
 * @param {{timeMin: string, timeMax: string}} query
 * @returns {Object} Returns an object with merged free and busy profiles:
 *                   {
 *                     free: {start: string, end: string},
 *                     busy: {start: string, end: string}
 *                   }
 */
exports.mergeFree = function(calendars, query) {
  // merge the free intervals
  var allFree = Object.keys(calendars).reduce(function (allFree, calendarId) {
    var entry = calendars[calendarId];
    var busy = entry.busy || [];
    var free = intervals.invert(busy, query.timeMin, query.timeMax);

    return allFree.concat(free);
  }, []);

  var free = intervals.merge(allFree);
  var busy = intervals.invert(free, query.timeMin, query.timeMax);

  return {
    free: free,
    busy: busy
  };
};

// create an array with all errors listed
exports.mergeErrors = function (calendars) {
  return Object.keys(calendars).reduce(function (errors, calendarId) {
    var entry = calendars[calendarId];
    if (entry.errors && entry.errors.length > 0) {
      errors = errors.concat(entry.errors);
    }
    return errors;
  }, []);
}

/**
 * Retrieve a new access token from a given refreshToken
 * https://developers.google.com/accounts/docs/OAuth2WebServer#refresh
 * @param {String} refreshToken
 * @param {function(Error, object)} callback   On success, the returned `object`
 *                                           contains parameters access_token,
 *                                           token_type, expires_in, and id_token
 */
exports.refreshAccessToken = function(refreshToken, callback) {
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
};



/**
 * Generate availability events
 * @param {Object} params
 * @param {string} timeZone
 * @param {function} callback
 */
// TODO: change to a synchronous function
exports.generateAvailabilityEvents = function (params, timeZone, callback) {
  var calendar = params.calendar;

  if (calendar) {
    if(params.tag === undefined) {
      return callback(new Error('Property "tag" expected'), null)
    }
    if (!Array.isArray(params.days)) {
      return callback(new Error('Property "days" expected, should be an Array'), null);
    }
    if(params.zone === undefined) {
      return callback(new Error('Property "zone" expected with the time zone'), null)
    }

    try {
      var events = params.days.map(function (day) {
        var start = moment(getDate(day.day) + 'T' + formatTime(day.start))
            .zone(params.zone)
            .format();  // format as "2014-11-24T15:26:01+01:00"

        var end = moment(getDate(day.day) + 'T' + formatTime(day.end))
            .zone(params.zone)
            .format();  // format as "2014-11-24T15:26:01+01:00"

        // return a Google Calendar Event
        return {
          summary: params.tag + '',
          start: {
            dateTime: start,
            timeZone: timeZone
          },
          end: {
            dateTime: end,
            timeZone: timeZone
          },
          recurrence: ['RRULE:FREQ=WEEKLY'],
          reminders: {
            useDefault: false
          }
        };
      });
    }
    catch (err) {
      return callback(err, null);
    }

    callback(null, events);
  }
  else if (params.createCalendar) {
    // TODO:
    console.log('TODO: create a new calendar');

    callback(new Error('Creating a new calendar is not yet implemented...'), null);
  }
  else {
    return callback(new Error('Property "calendar" or "createCalendar" expected'), null);
  }
};

/**
 * Parse a day object into an interval with start and end
 * @param {{day: string, zone: string | number, start: string, end: string}} day
 * @return {{start: string, end: string}}
 */
function parseDay(day) {
  return {
    start: moment(getDate(day.day) + 'T' + formatTime(day.start))
        .zone(day.zone)
        .toISOString(),

    end: moment(getDate(day.day) + 'T' + formatTime(day.end))
        .zone(day.zone)
        .toISOString()
  };
}

/**
 * Get a date like "2014-11-24" from a week day like "Tuesday".
 * Throws an error in case of an unknown weekday.
 * @param {string} weekday   Case insensitive week day like "Sunday"
 * @return {string} the date of this day this week, formatted as "YYYY-MM-DD"
 */
function getDate(weekday) {
  var DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  var isoWeekday = DAYS.indexOf(weekday.toLowerCase()) + 1;
  if (isoWeekday == 0) {
    throw new Error('Unknown weekday "' + weekday + '"');
  }

  var date = moment();
  var week = date.week();
  date.isoWeekday(isoWeekday);
  if (date.week() > week) {
    date.add(-7, 'days');
  }

  return date.format('YYYY-MM-DD');
}

/**
 * Format a time like '9:00' into '09:00:00'
 * @param {string} time
 * @return {string} formattedTime
 */
function formatTime(time) {
  var array = time.split(':');

  while (array.length < 3) {
    array.push('00');
  }

  return array
      .map(function (entry) {
        while (entry.length < 2) {
          entry = '0' + entry;
        }
        return entry;
      })
      .join(':');
}

/**
 * Get the timezone of the given calendar
 * @param {string} calendarId
 * @param {string} accessToken
 * @param {function} callback    Called as callback(err, timeZone: string)
 */
exports.getTimeZone = function (calendarId, accessToken, callback) {
  gcal(accessToken).calendarList.list(function(err, data) {
    if(err) return callback(err, null);

    var items = data.items || [];
    var calendar = items.filter(function (item) {
      return item.id == calendarId;
    })[0];

    if (calendar == undefined) {
      return callback(new Error('Calendar "' + calendarId + '" not found'), null)
    }

    if (calendar.timeZone == undefined) {
      return callback(new Error('No time zone information found for calendar "' + calendarId + '"'), null)
    }

    callback(null, calendar.timeZone);
  });
};
