var mongojs = require('mongojs');
var async = require('async');
var gutils = require('./google-utils');

/**
 * open a connection to mongodb
 * @param {string} url  Url of the mongo database, for example `mongodb://127.0.0.1:27017/mydata'
 */
module.exports = function (url) {
  var db = mongojs(url, ['users', 'groups']);

  var users = {
    /**
     * Get a user object from the database
     * @param {string} email
     * @param {function} callback    Called as callback(err, user)
     */
    get: function (email, callback) {
      db.users.findOne({
        query: {email: email}
      }, callback);
    },

    /**
     * Get a user by email from the database, and ensure there is a valid
     * accessToken available in the users object.
     * @param {String} email
     * @param {function} callback    Called as callback(err, user)
     */
    getAuthenticated: function (email, callback) {
      db.users.findOne({
        query: {email: email}
      }, function (err, user) {
        if (err) return callback(err, null);

        if (user) {
          // check if the authentication tokens are present on the user object
          if (user.auth === undefined ||
              user.auth.accessToken === undefined ||
              user.auth.expires === undefined ||
              user.auth.refreshToken === undefined) {
            return callback(new Error('Authentication tokens missing'), null);
          }

          // check whether the accessToken is expired. If so, get a new one
          if (new Date(user.auth.expires) < (Date.now() + 5 * 60 * 1000)) {
            // access token expires within 5 minutes, get a new one
            console.log('refreshing accessToken of user ' + email + '...'); // TODO: cleanup

            gutils.refreshAccessToken(user.auth.refreshToken, function (err, result) {
              if (err) return callback(err, null);

              if (result.access_token && result.expires_in) {
                // store the new accessToken and refreshToken in the user's profile
                users.update({
                  email: user.email,
                  auth: {
                    accessToken: result.access_token,
                    refreshToken: user.auth.refreshToken,
                    expires: new Date(Date.now() + result.expires_in * 1000).toISOString()
                  }
                }, callback);
              }
              else {
                console.log('Failed to refresh access token', result); // TODO: cleanup
                callback(new Error('Failed to refresh access token'), null);
              }
            });
          }
          else {
            // access token is ok, return the user
            callback(null, user);
          }
        }
        else {
          callback(new Error('User not found'), null);
        }
      });
    },

    /**
     * Save a changed user object to the database
     * @param {Object} user
     * @param {function} callback       Called as callback(err, updatedUser)
     */
    update: function (user, callback) {
      user.updated = new Date().toISOString();

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
    },

    /**
     * Remove a user from the database
     * @param {string} email
     * @param {function} callback
     */
    remove: function (email, callback) {
      db.users.remove({email: email}, callback);
    }
  };

  return {
    db: db,
    users: users
  };
};

