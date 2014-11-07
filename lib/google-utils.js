var request = require('request');
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
 *                     calendars: THE_ORIGINAL_CALENDARS,
 *                     errors: Array.<string>,
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
  var errors = mergeErrors(calendars);

  return {
    calendars: calendars,
    errors: errors,
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
 *                     calendars: THE_ORIGINAL_CALENDARS,
 *                     errors: Array.<string>,
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
  var errors = mergeErrors(calendars);

  return {
    calendars: calendars,
    errors: errors,
    free: free,
    busy: busy
  };
};

// create an array with all errors listed
function mergeErrors(calendars) {
  return Object.keys(calendars).reduce(function (errors, calendarId) {
    var entry = calendars[calendarId];
    if (entry.errors && entry.errors.length > 0) {
      errors[calendarId] = entry.errors;
    }
    return errors;
  }, {});
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
