var gcal = require('google-calendar');
var gutils = require('./google-utils');

/**
 * Authorize access to a users calendar
 * @param {string} requester    Email address of the one wanting access to user
 * @param {Object} user         The user to which the requester wants access
 * // TODO: introduce scope @param {string} scope        Scope of the access. Choose 'busy' or 'full'
 * @param {function (Error, string, Object)} callback
 *            called as `callback(err, accessToken, user)`
 */
exports.authorize = function(requester, user, callback) {
  var accessToken = user.auth && user.auth.accessToken;
  if (!accessToken) return callback(new Error('No valid access token'), null, null);

  function ok () {
    callback(null, accessToken, user);
  }

  function sorry ( ) {
    callback(new Error('Unauthorized'), null, null);
  }

  function fail(err) {
    callback(err, null, null);
  }

  if (requester == user.email) {
    // you always get access to your own calendar
    return ok();
  }
  else if (user.share == 'calendar') {
    // see if the requester is in the acl list of the users calendar
    gcal(accessToken).acl.list(user.email, function (err, contacts) {
      if (err) return fail(err);

      var found = contacts.items && contacts.items.some(function (contact) {
        if (contact.scope && contact.scope.type == 'user') {
          return contact.scope.value == requester;
        }
        else if (contact.scope && contact.scope.type == 'domain') {
          return contact.scope.value == requester.split('@').pop();
        }
        else {
          return false;
        }
      });

      found ? ok() : sorry();
    });
  }
  else if (user.share == 'contacts') {
    var query = ''; // TODO: utilize query
    gutils.getContacts(user.email, accessToken, query, function (err, contacts) {
      if (err) return callback(err, null, null);

      var found = contacts.feed.entry && contacts.feed.entry.some(function (contact) {
        return contact.gd$email && contact.gd$email.some(function (email) {
          return email.address == requester;
        });
      });

      found ? ok() : sorry();
    });
  }
  else {
    // fallback (should not happen)
    callback(new Error('Unauthorized'), null, null);
  }
};
