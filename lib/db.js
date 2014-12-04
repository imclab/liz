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
      if (profile.role == 'group') {
        // see if the group exists
        db.profiles.findOne({
          query: {group: profile.group}
        }, function (err, existingProfile) {
          if (err) return callback(err, null);

          if (existingProfile == undefined) {
            // in case of a new group, immediately give access being the first member.
            _update(profile, {access: 'granted'}, callback);
          }
          else {
            // update with an existing group
            _update(profile, {access: 'pending'}, callback);
          }
        });
      }
      else { // role == 'individual'
        _update(profile, {access: 'granted'}, callback);
      }

      function _update(profile, profileOnInsert, callback) {
        var changes = _.extend({}, profile);
        delete changes._id;
        delete changes.access; // refuse to update the access field coming from the client side

        db.profiles.update({
          _id: profile._id // note that profile._id can be undefined, in that case, a new doc will be created
        }, {
          $set: changes,
          $setOnInsert: profileOnInsert
        }, {
          new: true,
          upsert: true
        }, function (err, result) {
          if (err) callback(err, null);

          callback(null, 'ok');
        });
      }
    },

    /**
     * Get a list with all pending requests for team access
     * @param {string} userId     The user for which to return the list with pending requests
     * @param {function} callback Callback function, called as callback(err, profiles)
     */
    pending: function (userId, callback) {
      // find all profiles of this user
      db.profiles.find({
        query: {
          user: userId,
          role: 'group',
          access: 'granted'
        }
      }, function (err, profiles) {
        if (err) return callback(err, null);

        var groups = profiles.map(function(profile) {
          return profile.group;
        });

        // find all profiles with pending access
        db.profiles.find({
          query: {
            role: 'group',
            group: {$in: groups},
            access: 'pending'
          }
        }, callback);
      });
    },

    /**
     * Grant permission for a user to join a group
     * @param {string} groupName   Name of the group for which forUser wants access
     * @param {string} fromUser    The user who wants to change the permission.
     *                             Must be an existing team member
     * @param {string} forUser     The user who wants to join a group.
     * @param {string} access      New value for the field access, can be
     *                             'granted' or 'denied'
     * @param {function} callback  Called as function (err, 'ok')
     */
    grant: function (groupName, fromUser, forUser, access, callback) {
      if (access !== 'granted' && access !== 'denied') {
        return callback(new Error('Access value must be "granted" or "denied"'));
      }

      // see if from user is a member of this team
      db.profiles.findOne({
        query: {
          user: fromUser,
          group: groupName,
          access: 'granted'
        }
      }, function (err, group) {
        if (err) return callback(err);

        // refuse to change the profile, fromUser is no team member
        if (group == undefined) {
          return callback(new Error('No permission'));
        }

        // change the access field (only update when the profile exists)
        db.profiles.update({
          user: forUser,
          group: groupName
        }, {
          $set: {
            access: access
          }
        }, {}, function (err, result) {
          if (err) return callback(err, null);

          return callback(null, 'ok');
        });
      });
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
     *                              - `member: string` Filter groups having this member
     *                              TODO: add filter options
     * @param {function} callback   Called as callback(err, profiles),
     *                              Where profiles is an array `Array.<Group>`,
     *                              and Group is an object {name: string, count: number, members: Array.<string>}
     */
    list: function (options, callback) {
      var mapFn = function () {
        if (this.role == 'group' && this.access == 'granted') {
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

      // TODO: do this map reduce after the profiles have changed instead of for every view of the groups
      db.profiles.mapReduce(mapFn, reduceFn, _options, function (err, result) {
        if (err && err.message == 'ns doesn\'t exist') {
          // db.aggregated_groups doesn't exist
          return callback(null, []);
        }

        if (err) return callback(err, null);

        // build filter options
        var filterOptions = {};
        if (options && options.member != undefined) {
          // TODO: smarter query
          filterOptions['value.members'] = {
            $elemMatch: {
              $in: [options.member]
            }
          };
        }

        db.aggregated_groups.find(filterOptions, function (err, groups) {
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

