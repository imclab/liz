var mongojs = require('mongojs');
var async = require('async');
var gutils = require('./google-utils');

/**
 * open a connection to mongodb
 * @param {string} url  Url of the mongo database, for example `mongodb://127.0.0.1:27017/mydata'
 */
module.exports = function (url) {
  var db = mongojs(url, ['users', 'groups', 'aggregated_groups', 'sessions']);

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

  /**
   * Get the document id for given group and email
   * @param {string} email
   * @param {string} group
   * @returns {string} Returns the unique id for this group and email
   */
  function getGroupsId(email, group) {
    // TODO: make group name case insensitive?
    return group.trim() + ':' + email.trim().toLowerCase();
  }

  var groupsAPI = {
    /**
     * Add a group to a user
     * @param {string} email
     * @param {string} group
     * @param {function} callback   Called as callback(err, group)
     */
    add: function (email, group, callback) {
      // choose our own id to prevent duplicates
      var id = getGroupsId(email, group);

      db.groups.update(
          {_id: id},
          {
            $set: {
              email: email,
              group: group
            }
          },
          {upsert: true},
          function (err, document) {
        if (err) return callback(err, null);

        return callback(null, group);
      });
    },

    /**
     * Remove a group from a user
     * @param {string} email
     * @param {string} group
     * @param {function} callback   Called as callback(err, group)
     */
    remove: function (email, group, callback) {
      // choose our own id to prevent duplicates
      var id = getGroupsId(email, group);

      db.groups.remove({_id: id}, function (err, document) {
        if (err) return callback(err, null);

        return callback(null, document);
      });
    },

    /**
     * Add or remove one or multiple groups to/from a user
     * @param {string} email              Email of the user
     * @param {{add: string | string[], remove: string | string[]}} changes
     *                                    An object with properties:
     *                                    - `add`: a group name or an array with
     *                                      group names to be added
     *                                    - `remove`: a group name or array with
     *                                      group names to be added
     * @param {function} callback         Called as callback(err, groups),
     *                                    Where groups is an array with all the
     *                                    users group names
     */
    update: function (email, changes, callback) {
      // get array with additions
      var additions = Array.isArray(changes.add) ? changes.add :
          (changes.add !== undefined) ? changes.add : [];

      // get array with removals
      var removals = Array.isArray(changes.remove) ? changes.remove :
          (changes.remove !== undefined) ? changes.remove : [];

      // ignore removals of groups which are also in the additions
      removals = removals.filter(function (group) {
        return additions.indexOf(group) === -1;
      });

      async.parallel({
        additions: function (callback) {
          async.forEach(additions, function (group, cb) {
            groupsAPI.add(email, group, cb);
          }, callback);
        },
        removals: function (callback) {
          async.forEach(removals, function (group, cb) {
            groupsAPI.remove(email, group, cb);
          }, callback);
        }
      }, function (err, results) {
        if (err) return callback(err, null);

        // return all groups of this user
        groupsAPI.get(email, callback);
      });
    },

    /**
     * Replace all groups of a user with a new set of groups
     * @param {string} email              Email of the user
     * @param {string[]} groups           Array with group names
     * @param {function} callback         Called as callback(err, groups),
     *                                    Where groups is an array with all the
     *                                    users group names
     */
    replace: function (email, groups, callback) {
      groupsAPI.get(email, function (err, oldGroups) {
        if (err) return callback(err, null);

        var add = groups.filter(function (group) {
          return oldGroups.indexOf(group) == -1;
        });

        var remove = oldGroups.filter(function (group) {
          return groups.indexOf(group) == -1;
        });

        groupsAPI.update(email, {
          add: add,
          remove: remove
        }, callback);
      });
    },

    /**
     * Get the groups of a specific user
     * @param {string} email            Email of the user
     * @param {function} callback       Called as callback(err, groups),
     *                                  Where groups is an array with group names
     */
    get: function (email, callback) {
      db.groups.find({
        query: {email: email}
      }, function (err, groups) {
        if (err) return callback(err, null);

        callback(null, groups.map(function (group) {
          return group.group;
        }));
      });
    },

    /**
     * Get all groups
     * @param {Object} options      Output options. Can have the following properties:
     *                              - `exclude: Array.<string>`, a list with property names
     *                                of the returned groups to exclude from the output.
     *                              TODO: add filter options
     * @param {function} callback   Called as callback(err, groups),
     *                              Where groups is an array `Array.<Group>`,
     *                              and Group is an object {name: string, count: number, members: Array.<string>}
     */
    list: function (options, callback) {
      var mapFn = function () {
        emit(this.group, this.email);
      };

      var reduceFn = function (group, emails) {
        return {
          group: group,
          count: emails.length,
          members: emails
        }
      };

      var options = {
        out: 'aggregated_groups',
        finalize: function (group, emails) {
          // MongoDB will not call the reduce function for a key that has only a single value.
          // The values argument is an array whose elements are the value objects that are “mapped” to the key.
          // http://docs.mongodb.org/manual/reference/method/db.collection.mapReduce/#mapreduce-reduce-mtd
          if (typeof emails === 'string') {
            return {
              group: group,
              count: 1,
              members: [emails]
            };
          }
          return emails;
        }
      };

      db.groups.mapReduce(mapFn, reduceFn, options, function (err, result) {
        if (err && err.message == 'ns doesn\'t exist') {
          // db.groups doesn't exist
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
    groups: groupsAPI
  };
};

