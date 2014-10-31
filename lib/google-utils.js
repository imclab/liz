var request = require('request');
var config = require('../config');

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
