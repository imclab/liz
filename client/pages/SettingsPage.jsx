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
      groupsList: []
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
      <Selectize
          value={this.state.user.share}
          options={this.SHARE}
          onChange={this.handleShareSelection}
      />

      <h2>Account</h2>
      <p><button onClick={this.deleteAccount} className="btn btn-danger">Delete account</button></p>
    </div>;
  },

  renderAvailabilityTable: function () {
    var calendarList = this.state.calendarList;
    var calendarOptions = this.getCalendarOptions();
    var groupOptions = this.getGroupOptions();

    var header = <tr key="header">
      <th>Calendar</th>
      <th>Tag</th>
      <th>Role (optional)</th>
      <th></th>
    </tr>;

    var rows = this.state.groups.map(function (entry, index) {
      // TODO: for both selectize controls, utilize dynamic loading via query,
      //       retrieve filtered groups from the server
      return <tr key={entry._id || 'new'}>
            <td>
              <Selectize
                  options={calendarOptions}
                  value={entry.calendar}
                  placeholder="Select a calendar..."
                  onChange={function (value) {
                    this.handleGroupChange(index, 'calendar', value);
                  }.bind(this)}
              />
            </td>
            <td>
              <input
                  type="text"
                  className="form-control"
                  value={entry.tag}
                  placeholder="Event title..."
                  onChange={function (event) {
                    this.handleGroupChange(index, 'tag', event.target.value);
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
                    this.handleGroupChange(index, 'group', value);
                  }.bind(this)}
              />
            </td>
            <td>
              <button
                  className="btn btn-danger"
                  title="Delete this row"
                  onClick={function () {
                    this.removeGroup(entry._id);
                  }.bind(this)}
              >&times;</button>
            </td>
          </tr>;
      }.bind(this));

      return <div>
        <table className="table">
          <colgroup>
            <col width="30%" />
            <col width="30%" />
            <col width="30%" />
            <col width="10%" />
          </colgroup>
          <tbody>
            {header}
            {rows}
            <tr key="footer">
              <td colSpan="4">
                <button
                    onClick={this.addGroup}
                    className="btn btn-primary"
                    title="Add a new row"
                >Add</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>;
  },

  handleGroupChange: function (index, field, value) {
    var groups = this.state.groups.slice(0);
    var group = _.extend({}, groups[index]);
    group[field] = value;
    groups[index] = group;

    this.setState({groups: groups});

    this.updateGroup(group);
  },

  addGroup: function () {
    var groups = this.state.groups.slice(0);
    groups.push({
      _id: UUID(),
      tag: 'Available',
      calendar: this.props.user.email || '',
      group: ''
    });

    this.setState({groups: groups});
  },

  removeGroup: function (id) {
    var groups = this.state.groups;
    var group = groups.filter(function (group) {
      return group._id == id;
    })[0];
    console.log('removeGroup', group)
    if (group !== undefined) {
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
  },

  // save a changed group after a delay
  updateGroup: function (group) {
    var id = group._id;
    if (this.timers[id]) {
      clearTimeout(this.timers[id]);
    }

    var delay = 300; // ms
    this.timers[id] = setTimeout(function () {
      delete this.timers[id];
      console.log('saving group...', group);

      ajax.put('/groups', group)
          .then(function (groups) {
          }.bind(this))
          .catch(function (err) {
            console.log(err);
            displayError(err);
          }.bind(this));
    }.bind(this), delay);
  },
  timers: {},

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
        }.bind(this));
  },

  // load the list with calendars
  loadCalendarList: function () {
    ajax.get('/calendar/')
        .then(function (calendarList) {
          console.log('calendarList', calendarList);
          this.setState({calendarList: calendarList.items || []});
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

  getCalendarOptions: function () {
    var calendarList = this.state.calendarList.concat([]);

    // add missing options to the calendar options and group options
    this.state.groups.forEach(function (entry) {
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

  getGroupOptions: function () {
    var groupsList = this.state.groupsList;

    // add missing options to the calendar options and group options
    this.state.groups.forEach(function (entry) {
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
  }
});
