var SettingsPage = React.createClass({
  getInitialState: function () {
    this.loadCalendarList();
    this.loadGroups();

    return {
      user: this.props.user,
      calendars: null,
      calendarsError: null,
      groups: null,
      groupsError: null
    };
  },

  render: function () {
    return <div>
      <h1>Settings</h1>

      <h2>Sharing</h2>
      <p>Who is allowed to view your free/busy profile and plan events in your calendar via Liz&#63;</p>
      <select value={this.state.user.share} onChange={this.handleShareSelection}>
        <option value="calendar">Everyone with access to my calendar</option>
        <option value="contacts">All my contacts</option>
        <option value="everybody">Everybody</option>
      </select>

      <h2>Calendars</h2>
      <p>Select which of your calendars will be used to generate your free/busy profile:</p>
      {this.renderCalendarList()}

      <h2>Teams</h2>
      <p>Add yourself to relevant teams. You can create new teams.</p>
      {this.renderGroups()}

      <h2>Availability profile</h2>
      <p>Select one of your calendars as availability profile. Fill this calendar with (repeating) events describing your availability. This can for example be your working hours, like Monday to Friday 9:00-18:00.</p>
      <p>(not yet implemented...)</p>

      <h2>Account</h2>
      <p><button onClick={this.deleteAccount} className="btn btn-danger">Delete account</button></p>
    </div>;
  },

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
          handleChange={this.handleGroupChange}
      />;
    }
    else {
      return <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>;
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
          this.setState({calendars: calendars.items || []});
        }.bind(this))
        .catch(function (err) {
          this.setState({calendarsError: err});
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
