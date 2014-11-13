var SettingsPage = React.createClass({
  getInitialState: function () {
    this.loadCalendarList();
    this.loadGroups();

    return {
      loading: true,
      user: this.props.user,
      calendars: null,
      calendarsError: null,
      groups: null,
      groupsError: null,

      // TODO: load from server
      availability: [
        {calendar: 'jos@almende.org', title: 'Available', group: null},
        {calendar: 'almende.org_6aihngh5upbj1i7vusgir7qll4@group.calendar.google.com', title: 'Available', group: 'Developer'}
      ],

      calendarOptions: [
        {value: 'jos@almende.org', text: 'Jos de Jong'},
        {value: 'blabal', text: 'Availability'}
      ],

      // TODO: load from server
      groupOptions: [
        {value: 'Developer', text: 'Developer'},
        {value: 'Consultant', text: 'Consultant'}
      ]
    };
  },

  render: function () {
    console.log('loading', this.state.loading)
    var availability;
    if (this.state.loading) {
      availability = <div>
        <h1>Settings</h1>
        <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>
      </div>;
    }
    else {
      availability = this.renderAvailabilityTable()
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
    console.log('availability', JSON.stringify(this.state.availability, null, 2))

    var availability = this.state.availability;
    var calendarOptions = this.state.calendars.map(function (calendar) {
      return {
        value: calendar.id,
        text: calendar.summary || calendar.id
      }
    });
    //var calendarOptions = this.state.calendarOptions;

    console.log('calenarOptions', JSON.stringify(calendarOptions, null, 2))

    var header = <tr key="header">
      <th>Calendar</th>
      <th>Tag</th>
      <th>Role (optional)</th>
    </tr>;

    var rows = availability.map(function (entry, index) {
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
                  options={this.state.groupOptions}
                  create={true}
                  createOnBlur={true}
                  value={entry.group}
                  placeholder="Select a role..."
                  onChange={function (event) {
                    this.handleAvailabilityChange(index, 'group', event.target.value);
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
  renderCalendarList: function () {
    var selection = this.state.user && this.state.user.calendars || [];

    if (this.state.calendarsError != null) {
      return <p className="error">{this.state.calendarsError.toString()}</p>
    }
    else if (this.state.calendars != null) {
      return <CalendarList
          calendars={this.state.calendars}
          selection={selection}
          onChange={this.handleCalendarSelection} />;
    }
    else {
      return <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>;
    }
  },

  // TODO: cleanup
  renderGroups: function () {
    if (this.state.groupsError != null) {
      return <p className="error">{this.state.groupsError.toString()}</p>
    }
    else if (this.state.groups != null) {
      var options = this.state.groups.map(function (name) {
        var group = {
          group: name,
          count: 1,
          members: [this.state.user.email]
        };
        group.text = this.groupLabel(group);
        return group;
      }.bind(this));

      return <Selectize
          ref="teams"
          load={this.loadGroupList}
          options={options}
          value={this.state.groups}
          create={true}
          createOnBlur={true}
          multiple={true}
          placeholder="Select one or multiple teams..."
          searchField={['group']}
          sortField="text"
          labelField="text"
          valueField="group"
          hideSelected={true}
          onChange={this.handleGroupChange}
      />;
    }
    else {
      return <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>;
    }
  },

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

  // load the list with calendars
  loadCalendarList: function () {
    ajax.get('/calendar/')
        .then(function (calendars) {
          console.log('calendars', calendars);
          this.setState({
            loading: false,
            calendars: calendars.items || []
          });
        }.bind(this))
        .catch(function (err) {
          this.setState({
            loading: false,
            calendarsError: err
          });
          console.log(err);
        }.bind(this));
  },

  // load the groups of the user
  loadGroups: function () {
    ajax.get('/groups')
        .then(function (groups) {
          console.log('groups', groups);
          this.setState({groups: groups});
        }.bind(this))
        .catch(function (err) {
          this.setState({groupsError: err});
          console.log(err);
        }.bind(this));
  },

  // load all existing, aggregated groups
  loadGroupList: function (query, callback) {
    // TODO: utilize query, retrieve filtered groups from the server
    if (this.options) {
      return callback(this.options);
    }

    console.log('load all groups...');
    ajax.get('/groups/list')
        .then(function (groups) {
          console.log('all groups', groups);

          // cache the retrieved groups
          this.options = groups.map(function (group) {
            return {
              group: group.group,
              text: this.groupLabel(group)
            }
          }.bind(this));

          callback(this.options);
        }.bind(this))
        .catch(function (err) {
          this.options = [];
          callback(this.options);

          console.log(err);
          displayError(err);
        }.bind(this));
  },

  handleGroupChange: function (groups) {
    ajax.put('/groups', groups || [])
        .then(function (groups) {
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  /**
   * Create a text label for a group
   * @param {{group: string, count: number, members: string[]}} group
   * @returns {string}  Returns a label to be displayed in the selectize.js box
   */
  groupLabel: function (group) {
    // TODO: show member count. Should update when you add yourself
    // return group.group + (group.count !== undefined ? (' (' + group.count + ')') : '')

    return group.group;
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
