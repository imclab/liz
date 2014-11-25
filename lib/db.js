var mongojs = require('mongojs');
var _ = require('lodash');
var gutils = require('./google-utils');

/**
 * open a connection to mongodb
 * @param {string} url  Url of the mongo database, for example `mongodb://127.0.0.1:27017/mydata'
 */
module.exports = function (url) {
  var db = mongojs(url, ['users', 'profiles', 'aggregated_groups', 'sessions']);

  // TODO: create appropriate indexes

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

  var profilesAPI = {
    /**
     * Add a profile to a user
     * @param {{user: string, role: string, group: string, calendars: string, tag: string}} profile
     * @param {function} callback   Called as callback(err, profile)
     */
    add: function (profile, callback) {
      db.profiles.insert(profile, function (err, document) {
        if (err) return callback(err, null);

        return callback(null, profile);
      });
    },

    /**
     * Create or update a profile to a user
     * @param {{user: string, role: string, group: string, calendars: string, tag: string}} profile
     * @param {function} callback   Called as callback(err, profile)
     */
    update: function (profile, callback) {
      if (profile._id) {
        var changes = _.extend({}, profile);
        delete changes._id;

        db.profiles.update({
          _id: profile._id
        }, {
          $set: changes
        }, {
          new: true,
          upsert: true
        }, function (err, profile) {
          if (err) return callback(err, null);

          return callback(null, profile);
        });
      }
      else {
        profilesAPI.add(profile, callback);
      }
    },

    /**
     * Remove a profile by id
     * @param {string | string[]} id   One id or an array with ids
     * @param {function} callback   Called as callback(err, profile)
     */
    remove: function (id, callback) {
      if (Array.isArray(id)) {
        async.map(id, profilesAPI.remove, callback);
      }
      else {
        db.profiles.remove({_id: id}, callback);
      }
    },

    /**
     * Remove all profiles of a user
     * @param {string} userId       Email of the user
     * @param {function} callback   Called as callback(err, profile)
     */
    removeAll: function (userId, callback) {
      db.profiles.remove({user: userId}, callback);
    },

    /**
     * Get all profiles of a user
     * @param {string} userId           Email of the user
     * @param {function} callback       Called as callback(err, profiles),
     *                                  Where profiles is an array with objects
     */
    list: function (userId, callback) {
      db.profiles.find({
        query: {user: userId}
      }, function (err, profiles) {
        if (err) return callback(err, null);

        callback(null, profiles);
      });
    }
  };

  var groupsAPI = {
    /**
     * Get a group by its id
     * @param {string} name        Group name (groupId)
     * @param {function} callback  Called as callback(err, Group), where Group is:
     *                             {name: string, count: number, members: string[]}
     */
    getByName: function (name, callback) {
      db.profiles.find({
        query: {group: name}
      }, function (err, docs) {
        if (err) return callback(err, null);

        if (docs.length == 0) return callback(new Error('Group not found'), null);

        var group = {
          name: name,
          count: docs.length,
          members: docs.map(function (doc) {
            return doc.user;
          })
        };
        callback(null, group);
      });
    },

    /**
     * Get all groups (aggregates all profiles which have role=='group')
     * @param {Object} options      Output options. Can have the following properties:
     *                              - `exclude: Array.<string>`, a list with property names
     *                                of the returned profiles to exclude from the output.
     *                              TODO: add filter options
     * @param {function} callback   Called as callback(err, profiles),
     *                              Where profiles is an array `Array.<Group>`,
     *                              and Group is an object {name: string, count: number, members: Array.<string>}
     */
    list: function (options, callback) {
      var mapFn = function () {
        if (this.role == 'group') {
          emit(this.group, this.user);
        }
      };

      var reduceFn = function (name, members) {
        return {
          id: 'group:' + name,
          name: name,
          count: members.length,
          members: members
        }
      };

      var _options = {
        out: 'aggregated_groups',
        finalize: function (name, users) {
          // MongoDB will not call the reduce function for a key that has only a single value.
          // The values argument is an array whose elements are the value objects that are “mapped” to the key.
          // http://docs.mongodb.org/manual/reference/method/db.collection.mapReduce/#mapreduce-reduce-mtd
          if (typeof users === 'string') {
            return {
              id: 'group:' + name,
              name: name,
              count: 1,
              members: [users]
            };
          }
          return users;
        }
      };

      db.profiles.mapReduce(mapFn, reduceFn, _options, function (err, result) {
        if (err && err.message == 'ns doesn\'t exist') {
          // db.aggregated_groups doesn't exist
          return callback(null, []);
        }

        if (err) return callback(err, null);

        db.aggregated_groups.find(function (err, groups) {
          if (err) return callback(err, null);

          return callback(null, groups.map(function (group) {
            return group.value;
          }))
        });
      });
    }
  };

  return {
    db: db,
    users: users,
    profiles: profilesAPI,
    groups: groupsAPI
  };
};

