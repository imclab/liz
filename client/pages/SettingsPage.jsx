var SettingsPage = React.createClass({
  SHARE: [
    {value:'calendar', text: 'Everyone with access to my calendar'},
    {value:'contacts', text: 'All my contacts'},
    {value:'everybody', text: 'Everybody'}
  ],

  getInitialState: function () {
    this.loadCalendarList();
    this.loadGroupsList();
    this.loadUserGroupsList();
    this.loadProfiles();
    this.loadAccessRequests();

    return {
      loading: true,
      user: this.props.user,
      profiles: null,
      profilesError: null,
      calendarList: [],
      calendarListError: null,
      calendarListLoading: true,
      groupsList: [],
      userGroupsList: null,
      accessRequests: null,

      showHelpAvailability: false,
      showHelpBusy: false
    };
  },

  render: function () {
    var profiles;
    if (this.state.loading) {
      profiles = <div>
        <h1>Settings</h1>
        <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>
      </div>;
    }
    else if (this.state.profilesError) {
      profiles = <p className="error">{this.state.profilesError.toString()}</p>
    }
    else {
      profiles = this.renderProfiles();
    }

    // TODO: replace loading all groups with smart auto completion, loading groups matching current search
    return <div>
      <h1>Settings</h1>

      <h2>Availability</h2>
      <p>Create one or multiple profiles to specify when you are available and in what role.</p>
      {profiles}

      <Profile
          ref="profile"
          groups={this.getGroupOptions()}
          calendars={this.getCalendarOptions()}
          onChange={this.handleProfileChange}
      />

      {this.renderGroups()}

      <h2>Sharing</h2>
      <p>Who is allowed to view your free/busy profile and plan events in your calendar via Liz&#63;</p>
      <Selectize
          value={this.state.user.share}
          options={this.SHARE}
          onChange={this.handleShareSelection}
      />

      <h2>Account</h2>
      <p>Remove your account at Liz.</p>
      <p><button onClick={this.deleteAccount} className="btn btn-danger">Delete account</button></p>
    </div>;
  },

  renderProfiles: function () {
    var profiles = this.state.profiles || [];
    var rows = profiles.map(this.renderProfile);

    return <div>
      {rows}
      <div>
        <button
            onClick={this.addProfile}
            className="btn btn-normal"
            title="Add a new profile"
        ><span className="glyphicon glyphicon-plus"></span> Add</button>
      </div>
    </div>;
  },

  renderProfile: function (profile) {
    // TODO: for both selectize controls, utilize dynamic loading via query,
    //       retrieve filtered profiles from the server

    var calendarsArray = profile.calendars && profile.calendars.split(',') || [];
    var calendars = calendarsArray.map(function (calendarId, index) {
      calendarId = calendarId.trim();
      var calendar = this.state.calendarList.filter(function (c) {
        return c.id == calendarId;
      })[0];

      var text = (calendar !== undefined) ? calendar.summary : calendarId;
      if (index != calendarsArray.length - 1) {
        text += ', ';
      }

      return <span title={calendarId}>{text}</span>;
    }.bind(this));

    return <div key={profile._id} className="profile-entry">
      <table>
        <tbody>
          <tr>
            <th>Role</th>
            <td>{(profile.role == 'group') ? 'Team member' : 'Individual'}</td>
          </tr>
                {
                    (profile.role == 'group') ?
                        <tr>
                          <th>Team</th>
                          <td>{profile.group}</td>
                        </tr> : ''
                    }
          <tr>
            <th>Calendars</th>
            <td>{calendars}</td>
          </tr>
          <tr>
            <th>Tag</th>
            <td>{profile.tag}</td>
          </tr>
                {
                    (profile.access == 'pending') ?
                        <tr>
                          <th>Access</th>
                          <td><b style={{color: 'orange'}}>pending</b> {
                              this.renderPopover('Access', 'Your request to join the team "' + profile.group + '" awaits approval of one of the team members.')
                              }</td>
                        </tr> :
                        (profile.access == 'denied') ?
                            <tr>
                              <th>Access</th>
                              <td><b style={{color: 'red'}}>denied</b> {
                                  this.renderPopover('Access', 'Your request to join the team "' + profile.group + '" is denied by one of the team members.')
                                  }</td>
                            </tr> :
                            ''
                    }
        </tbody>
      </table>
      <div className="menu">
        <button
            className="btn btn-normal"
            title="Edit this profile"
            onClick={function () {
              this.editProfile(profile._id);
            }.bind(this)}
        ><span className="glyphicon glyphicon-pencil"></span></button>&nbsp;
        <button
            className="btn btn-danger"
            title="Delete this profile"
            onClick={function () {
              this.removeProfile(profile._id);
            }.bind(this)}
        ><span className="glyphicon glyphicon-remove"></span></button>
      </div>
    </div>;
  },

  renderAccessRequests: function () {
    if (this.state.accessRequests && this.state.accessRequests.length > 0) {
      return this.state.accessRequests.map(function (profile) {
        return <div className="access-request">
          User <b>{profile.user}</b> requests access to the team <b>{profile.group}</b> <div
              style={{display: 'inline-block'}}>
            <button
                className="btn btn-primary"
                onClick={function () {
                  this.grantAccess({
                    user: profile.user,
                    group: profile.group,
                    access: 'granted'
                  });
                }.bind(this)}
            >Accept</button>&nbsp;
            <button
                className="btn btn-danger"
                onClick={function () {
                  this.grantAccess({
                    user: profile.user,
                    group: profile.group,
                    access: 'denied'
                  });
                }.bind(this)}
            >Deny</button>
          </div>
        </div>;
      }.bind(this));
    }
    else {
      return null;
    }
  },

  renderGroups: function () {
    var content;
    if (this.state.userGroupsList == null) {
      content = <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>;
    }
    else if (this.state.userGroupsList.length > 0) {
      // Strategies is still mockup
      var strategies = [
        {
          text: 'Randomly selection',
          value: 'random'
        }
      ];

      content = this.state.userGroupsList
          .map(function (group) {
            return <div key={group.name} className="profile-entry">
              <table className="fill">
                <tbody>
                  <tr>
                    <th>Team</th>
                    <td>{group.name}</td>
                  </tr>
                  <tr>
                    <th>Members</th>
                    <td>{group.members.join(', ')}</td>
                  </tr>
                  <tr>
                    <th>
                    Strategy {
                        this.renderPopover('Strategy', 'Select a strategy on how new events are distributed over available team members.')
                    }
                    </th>
                    <td>
                      <div className="strategy">
                        <Selectize
                          options={strategies}
                          value={strategies[0].value}
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          }.bind(this));
    }
    else {
      content = <div>(no teams)</div>
    }

    return <div>
      <h2>Teams</h2>
      {this.renderAccessRequests()}
      {content}
    </div>;
  },

  renderPopover: function (title, content, placement) {
    return <a href="#" onClick={function (event) {event.preventDefault()}}>
      <span
          data-toggle="popover"
          data-placement={placement || 'top'}
          title={title}
          data-content={content}
          className="glyphicon glyphicon-info-sign"
          aria-hidden="true"
      ></span>
    </a>
  },

  componentDidMount: function () {
    // initialize all popovers
    $('[data-toggle="popover"]').popover();
  },

  componentDidUpdate: function () {
    // initialize all popovers
    $('[data-toggle="popover"]').popover();
  },

  addProfile: function () {
    var profile = {
      user: this.props.user.email,
      calendars: this.props.user.email || '',
      tag: '#available',
      role: 'individual',
      access: null
    };

    this.refs.profile.show(profile);
  },

  editProfile: function (id) {
    var profile = this.findProfile(id);
    if (profile) {
      this.refs.profile.show(profile);
    }
  },

  removeProfile: function (id) {
    var profile = this.findProfile(id);
    console.log('removeProfile', profile);
    if (profile !== undefined) {
      // TODO: implement a nicer looking confirm box
      if (confirm('Are you sure you want to delete this profile?')) {
        var profiles = this.state.profiles;
        profiles.splice(profiles.indexOf(profile), 1);

        this.setState({profiles: profiles});

        ajax.del('/profiles/' + id)
            .then(function (profiles) {
              this.loadUserGroupsList(); // refresh the teams list
            }.bind(this))
            .catch(function (err) {
              console.log(err);
              displayError(err);
            }.bind(this));
      }
    }
  },

  /**
   * Find a profile by its id
   * @param {string} id   The id of a profile (stored in the field _id)
   * @returns {Object | undefined}  Returns the profile when found, else returns undefined
   */
  findProfile: function (id) {
    var profiles = this.state.profiles;
    return profiles.filter(function (profile) {
      return profile._id == id;
    })[0];
  },

  // save a changed profile after a delay
  saveProfile: function (profile) {
    var id = profile._id;
    if (id === undefined) {
      id = UUID();
      profile._id = id;
    }
    if (this.timers[id]) {
      clearTimeout(this.timers[id]);
    }

    var delay = 300; // ms
    this.timers[id] = setTimeout(function () {
      delete this.timers[id];
      console.log('saving profile...', profile);

      ajax.put('/profiles', profile)
          .then(function (result) {
            // TODO: do something with the returned result?
            // FIXME: new profile is not updated
            this.loadProfiles();        // reload the list with profiles
            this.loadUserGroupsList();  // refresh the teams list
          }.bind(this))
          .catch(function (err) {
            console.log(err);
            displayError(err);
          }.bind(this));
    }.bind(this), delay);
  },
  timers: {},

  handleProfileChange: function (profile) {
    console.log('profile changed', profile);
    var found = false;
    var profiles = this.state.profiles.map(function (p) {
      if (p._id == profile._id) {
        found = true;
        return profile;
      }
      else {
        return p;
      }
    });

    if (!found) {
      // a new profile
      // push a clone, else we get issues with the new item not being updated
      // when retrieved again from the server (with new access status).
      profiles.push(_.extend({}, profile));
    }

    this.setState({profiles: profiles});
    this.saveProfile(profile);
  },

  handleShareSelection: function (value) {
    var user = this.state.user;
    user.share = value;

    this.updateUser(user);
  },

  // load the profiles of the user
  loadProfiles: function () {
    ajax.get('/profiles')
        .then(function (profiles) {
          console.log('profiles', profiles);
          this.setState({
            loading: false,
            profiles: profiles
          });
        }.bind(this))
        .catch(function (err) {
          this.setState({
            loading: false,
            profilesError: err
          });
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  // load the list with calendars
  loadCalendarList: function () {
    ajax.get('/calendar/')
        .then(function (calendarList) {
          console.log('calendarList', calendarList);
          this.setState({
            calendarList: calendarList.items || [],
            calendarListLoading: false,
            calendarListError: null
          });
        }.bind(this))
        .catch(function (err) {
          this.setState({
            calendarListLoading: false,
            calendarListError: err
          });
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  // load all existing, aggregated groups
  loadGroupsList: function () {
    ajax.get('/groups')
        .then(function (groupsList) {
          console.log('groupsList', groupsList);
          this.setState({groupsList: groupsList});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  // load all existing, aggregated groups of this user
  loadUserGroupsList: function () {
    ajax.get('/groups?member='+ this.props.user.email)
        .then(function (userGroupsList) {
          console.log('userGroupsList', userGroupsList);
          this.setState({userGroupsList: userGroupsList});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  // load all pending requests for access to a team
  loadAccessRequests: function () {
    ajax.get('/profiles/pending')
        .then(function (accessRequests) {
          console.log('accessRequests', accessRequests);
          this.setState({accessRequests: accessRequests});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  grantAccess: function (profile) {
    ajax.post('/profiles/grant', profile)
        .then(function (result) {
          console.log('result', result);
          this.loadAccessRequests();
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
          this.loadAccessRequests();
        }.bind(this));
  },

  getCalendarOptions: function () {
    var calendarList = this.state.calendarList.concat([]);

    // add missing options to the calendar options and profile options
    var profiles = this.state.profiles || [];
    profiles.forEach(function (profile) {
      if (profile.calendars) {
        profile.calendars.split(',')
            .forEach(function (calendarId) {
              var calendarExists = calendarList.some(function (calendar) {
                return calendar.id == calendarId ;
              });
              if (!calendarExists) {
                calendarList.push({id: calendarId});
              }
            });
      }
    }.bind(this));

    // generate calendar options
    return calendarList.map(function (calendar) {
      var text = calendar.summary || calendar.id;
      if (text.length > 30) {
        text = text.substring(0, 30) + '...';
      }
      return {
        value: calendar.id,
        text: text
      }
    });
  },

  getGroupOptions: function () {
    return this.state.groupsList.map(function (entry) {
      return {
        value: entry.name,
        text: entry.name
      }
    }.bind(this));
  },

  updateUser: function (user) {
    this.setState({user: user});

    // propagate the selection to the parent component
    if (typeof this.props.onChange === 'function') {
      this.props.onChange(user)
    }
  },

  deleteAccount: function () {
    if (confirm ('Are you sure you want to delete your account?\n\nThis action cannot be undone.')) {
      ajax.del('/user/')
          .then(function () {
            // go to home
            location.href = '/';
          })
          .catch(function (err) {
            console.log(err);
            displayError(err);
          })
    }
  },

  showHelpBusy: function (event) {
    event.preventDefault();

    this.setState({showHelpBusy: true});
  },

  showHelpAvailability: function (event) {
    event.preventDefault();

    this.setState({showHelpAvailability: true});
  }
});
