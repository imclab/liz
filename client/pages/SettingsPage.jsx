var SettingsPage = React.createClass({
  getInitialState: function () {
    this.loadCalendarList();
    this.loadGroupsList();
    this.loadGroups();

    return {
      loading: true,
      user: this.props.user,
      calendars: [],
      groupsList: [],
      groups: null,
      groupsError: null,

      // TODO: load availability from server
      availability: [
        {calendar: 'jos@almende.org', title: 'Available', group: null},
        {calendar: 'almende.org_6aihngh5upbj1i7vusgir7qll4@group.calendar.google.com', title: 'Available', group: 'Developer'}
      ]
    };
  },

  render: function () {
    var availability;
    if (this.state.loading) {
      availability = <div>
        <h1>Settings</h1>
        <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>
      </div>;
    }
    else if (this.state.groupsError) {
      return <p className="error">{this.state.groupsError.toString()}</p>
    }
    else {
      try {
        availability = this.renderAvailabilityTable()
      }
      catch (err) {
        console.log(err)
      }
    }

    return <div>
      <h1>Settings</h1>

      <h2>Availability profile</h2>
      <p>
        Specify when you are available an in what role. To mark youself available, create (recurring) events in your calendar having the specified tag as event title.
      </p>
      {availability}

      <h2>Sharing</h2>
      <p>Who is allowed to view your free/busy profile and plan events in your calendar via Liz&#63;</p>
      <select value={this.state.user.share} onChange={this.handleShareSelection}>
        <option value="calendar">Everyone with access to my calendar</option>
        <option value="contacts">All my contacts</option>
        <option value="everybody">Everybody</option>
      </select>

      <h2>Account</h2>
      <p><button onClick={this.deleteAccount} className="btn btn-danger">Delete account</button></p>
    </div>;
  },

  renderAvailabilityTable: function () {
    var calendars = this.state.calendars;
    var calendarOptions = this.getCalendarOptions();
    var groupOptions = this.getGroupOptions();

    console.log('render availability', this.state.availability, calendarOptions, groupOptions)

    var header = <tr key="header">
      <th>Calendar</th>
      <th>Tag</th>
      <th>Role (optional)</th>
    </tr>;

    var rows = this.state.availability.map(function (entry, index) {
      // TODO: for both selectize controls, utilize dynamic loading via query,
      //       retrieve filtered groups from the server
      return <tr key={entry._id}>
            <td>
              <Selectize
                  options={calendarOptions}
                  value={entry.calendar}
                  placeholder="Select a calendar..."
                  onChange={function (value) {
                    this.handleAvailabilityChange(index, 'calendar', value);
                  }.bind(this)}
              />
            </td>
            <td>
              <input
                  type="text"
                  className="form-control"
                  value={entry.title}
                  placeholder="Event title..."
                  onChange={function (event) {
                    this.handleAvailabilityChange(index, 'title', event.target.value);
                  }.bind(this)}
              />
            </td>
            <td>
              <Selectize
                  value={entry.group}
                  options={groupOptions}
                  create={true}
                  createOnBlur={true}
                  placeholder="Select a role..."
                  onChange={function (value) {
                    this.handleAvailabilityChange(index, 'group', value);
                  }.bind(this)}
              />
            </td>
          </tr>;
      }.bind(this));

      return <table className="table">
          <colgroup>
            <col width="35%" />
            <col width="30%" />
            <col width="35%" />
          </colgroup>
          {header}
          {rows}
        </table>;
  },

  // TODO: cleanup
  //renderCalendarList: function () {
  //  var selection = this.state.user && this.state.user.calendars || [];
  //
  //  if (this.state.calendarsError != null) {
  //    return <p className="error">{this.state.calendarsError.toString()}</p>
  //  }
  //  else if (this.state.calendars != null) {
  //    return <CalendarList
  //        calendars={this.state.calendars}
  //        selection={selection}
  //        onChange={this.handleCalendarSelection} />;
  //  }
  //  else {
  //    return <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>;
  //  }
  //},

  // TODO: cleanup
  //renderGroups: function () {
  //  if (this.state.groupsError != null) {
  //    return <p className="error">{this.state.groupsError.toString()}</p>
  //  }
  //  else if (this.state.groups != null) {
  //    var options = this.state.groups.map(function (name) {
  //      var group = {
  //        group: name,
  //        count: 1,
  //        members: [this.state.user.email]
  //      };
  //      group.text = this.groupLabel(group);
  //      return group;
  //    }.bind(this));
  //
  //    return <Selectize
  //        ref="teams"
  //        load={this.loadGroupsList}
  //        options={options}
  //        value={this.state.groups}
  //        create={true}
  //        createOnBlur={true}
  //        multiple={true}
  //        placeholder="Select one or multiple teams..."
  //        searchField={['group']}
  //        sortField="text"
  //        labelField="text"
  //        valueField="group"
  //        hideSelected={true}
  //        onChange={this.handleGroupChange}
  //    />;
  //  }
  //  else {
  //    return <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>;
  //  }
  //},

  handleAvailabilityChange: function (index, field, value) {
    var clone = this.state.availability.slice();
    var obj = _.extend({}, clone[index]);
    obj[field] = value;
    clone[index] = obj;

    this.count = this.count ? this.count + 1 : 1;
    if (this.count < 100) {

      this.setState({availability: clone});
    }
  },

  handleCalendarSelection: function (selection) {
    var user = this.state.user;
    user.calendars = selection;

    this.updateUser(user);
  },

  handleShareSelection: function (event) {
    var user = this.state.user;
    user.share = event.target.value;

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
        }.bind(this));
  },

  // load the list with calendars
  loadCalendarList: function () {
    ajax.get('/calendar/')
        .then(function (calendars) {
          console.log('calendars', calendars);
          this.setState({calendars: calendars.items || []});
        }.bind(this))
        .catch(function (err) {
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

  // TODO: cleanup
  //handleGroupChange: function (groups) {
  //  ajax.put('/groups', groups || [])
  //      .then(function (groups) {
  //      }.bind(this))
  //      .catch(function (err) {
  //        console.log(err);
  //        displayError(err);
  //      }.bind(this));
  //},

  getCalendarOptions: function () {
    var calendars = this.state.calendars.concat([]);

    // add missing options to the calendar options and group options
    this.state.availability.forEach(function (entry) {
      if (entry.calendar) {
        var calendarExists = calendars.some(function (calendar) {
          return calendar.id == entry.calendar;
        });
        if (!calendarExists) {
          calendars.push({id: entry.calendar});
        }
      }
    }.bind(this));

    // generate calendar options
    return calendars.map(function (calendar) {
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
    var groupsList = this.state.groupsList;

    // add missing options to the calendar options and group options
    this.state.availability.forEach(function (entry) {
      if (entry.group) {
        var groupExists = groupsList.some(function (group) {
          return group.name == entry.group;
        });
        if (!groupExists) {
          groupsList.push({
            name: entry.group,
            count: 1,
            members: [this.props.user.email]
          });
        }
      }
    }.bind(this));

    // generate group options
    return groupsList.map(function (group) {
      return {
        value: group.name,
        text: this.groupLabel(group)
      }
    }.bind(this));
  },

  /**
   * Create a text label for a group
   * @param {{name: string, count: number, members: string[]}} group
   * @returns {string}  Returns a label to be displayed in the selectize.js box
   */
  groupLabel: function (group) {
    // TODO: show member count. Should update when you add yourself
    // return group.group + (group.count !== undefined ? (' (' + group.count + ')') : '')
    return group.name;
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
  }
});
