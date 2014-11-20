var SettingsPage = React.createClass({
  SHARE: [
    {value:'calendar', text: 'Everyone with access to my calendar'},
    {value:'contacts', text: 'All my contacts'},
    {value:'everybody', text: 'Everybody'}
  ],

  getInitialState: function () {
    this.loadCalendarList();
    this.loadGroupsList();
    this.loadGroups();

    return {
      loading: true,
      user: this.props.user,
      groups: null,
      groupsError: null,
      calendarList: [],
      calendarListError: null,
      calendarListLoading: true,
      groupsList: [],

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
    else if (this.state.groupsError) {
      profiles = <p className="error">{this.state.groupsError.toString()}</p>
    }
    else {
      profiles = this.renderProfiles();
    }

    return <div>
      <h1>Settings</h1>

      <h2>Availability profiles</h2>
      <p>Create one or multiple profiles to specify when you are available and in what role.</p>
      {profiles}

      <Profile
          ref="profile"
          roles={this.getRoleOptions()}
          calendars={this.getCalendarOptions()}
          onChange={this.handleProfileChange}
      />

      <h2>Sharing</h2>
      <p>Who is allowed to view your free/busy profile and plan events in your calendar via Liz&#63;</p>
      <Selectize
          value={this.state.user.share}
          options={this.SHARE}
          onChange={this.handleShareSelection}
      />

      <h2>Account</h2>
      <p><button onClick={this.deleteAccount} className="btn btn-danger">Delete account</button></p>
    </div>;
  },

  renderProfiles: function () {
    var header = <tr key="header">
      <th>Role</th>
      <th>Calendars</th>
      <th>Tag</th>
      <th></th>
    </tr>;

    var groups = this.state.groups || [];
    var rows = groups.map(function (entry) {
      // TODO: for both selectize controls, utilize dynamic loading via query,
      //       retrieve filtered groups from the server

      var calendarsArray = entry.calendars && entry.calendars.split(',') || [];
      var calendars = calendarsArray.map(function (calendarId) {
        calendarId = calendarId.trim();
        var calendar = this.state.calendarList.filter(function (c) {
          return c.id == calendarId;
        })[0];

        var text = (calendar !== undefined) ? calendar.summary : calendarId;
        var style = {
          display: 'inline-block',
          color: calendar && calendar.foregroundColor || '',
          backgroundColor: calendar && calendar.backgroundColor || '',
          margin: 3,
          padding: 3,
          borderRadius: 3
        };

        return <div style={style} title={calendarId}>{text}</div>;
      }.bind(this));

      return <tr key={entry._id}>
            <td>
              {entry.role}
            </td>
            <td>
              {calendars}
            </td>
            <td>
              {entry.tag}
            </td>
            <td>
              <button
                  className="btn btn-normal"
                  title="Edit this profile"
                  onClick={function () {
                    this.editProfile(entry._id);
                  }.bind(this)}
              ><span className="glyphicon glyphicon-pencil"></span></button>&nbsp;
              <button
                  className="btn btn-danger"
                  title="Delete this profile"
                  onClick={function () {
                    this.removeProfile(entry._id);
                  }.bind(this)}
              ><span className="glyphicon glyphicon-remove"></span></button>
            </td>
          </tr>;
      }.bind(this));

      return <div>
        <table className="table">
          <tbody>
            {header}
            {rows}
            <tr key="footer">
              <td colSpan="4">
                <button
                    onClick={this.addProfile}
                    className="btn btn-primary"
                    title="Add a new profile"
                >Add</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>;
  },

  addProfile: function () {
    var profile = {
      _id: UUID(),
      tag: '#available',
      role: this.props.user.email || '',
      calendars: this.props.user.email || ''
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
    var group = this.findProfile(id);
    console.log('removeProfile', group);
    if (group !== undefined) {
      // TODO: implement a nicer looking confirm box
      if (confirm('Are you sure you want to delete profile "' + group.name + '"?')) {
        var groups = this.state.groups;
        groups.splice(groups.indexOf(group), 1);

        this.setState({groups: groups});

        ajax.del('/groups/' + id)
            .then(function (groups) {
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
    var profiles = this.state.groups;
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

      ajax.put('/groups', profile)
          .then(function (profiles) {
            // TODO: do something with the returned profiles?
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
    var profiles = this.state.groups.map(function (p) {
      if (p._id == profile._id) {
        found = true;
        return profile;
      }
      else {
        return p;
      }
    });
    if (!found) {
      profiles.push(profile); // a new profile
    }

    this.setState({groups: profiles});
    this.saveProfile(profile);
  },

  handleCalendarSelection: function (selection) {
    var user = this.state.user;
    user.calendars = selection;

    this.updateUser(user);
  },

  handleShareSelection: function (value) {
    var user = this.state.user;
    user.share = value;

    this.updateUser(user);
  },

  // load the groups of the user
  loadGroups: function () {
    ajax.get('/groups')
        .then(function (groups) {
          console.log('groups', groups);
          this.setState({
            loading: false,
            groups: groups
          });
        }.bind(this))
        .catch(function (err) {
          this.setState({
            loading: false,
            groupsError: err
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
    ajax.get('/groups/list')
        .then(function (groupsList) {
          console.log('groupsList', groupsList);
          this.setState({groupsList: groupsList});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  getCalendarOptions: function () {
    var calendarList = this.state.calendarList.concat([]);

    // add missing options to the calendar options and group options
    var groups = this.state.groups || [];
    groups.forEach(function (entry) {
      if (entry.calendar) {
        var calendarExists = calendarList.some(function (calendar) {
          return calendar.id == entry.calendar;
        });
        if (!calendarExists) {
          calendarList.push({id: entry.calendar});
        }
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

  getRoleOptions: function () {
    var user = this.props.user;

    // all groups
    var groupsList = this.state.groupsList;

    // all groups of the user
    // add missing options to the calendar options and group options
    var groups = this.state.groups || [];
    groups.forEach(function (entry) {
      if (entry.group) {
        var groupExists = groupsList.some(function (group) {
          return group.name == entry.group;
        });
        if (!groupExists) {
          groupsList.push({
            name: entry.group,
            count: 1,
            members: [user.email]
          });
        }
      }
    }.bind(this));

    // email address of the user
    var selfExists = groupsList.some(function (group) {
      return group.name == user.email;
    });
    if (!selfExists) {
      groupsList.push({
        name: user.email,
        count: 1,
        members: [user.email]
      });
    }

    // generate group options
    return groupsList.map(function (group) {
      return {
        value: group.name,
        text: group.name
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
  },

  showWizard: function () {
    this.refs.wizard.show();
  }
});
