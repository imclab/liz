var SettingsPage = React.createClass({
  getInitialState: function () {
    // load the list with calendars
    ajax.get('/calendar/')
        .then(function (calendars) {
          console.log('calendars', calendars);
          this.setState({calendars: calendars.items || []});
        }.bind(this))
        .catch(function (err) {
          this.setState({
            error: err
          });
          console.log(err);
        }.bind(this));

    return {
      user: this.props.user,
      calendars: null,
      error: null
    };
  },

  render: function () {
    var selection = this.state.user && this.state.user.calendars || [];

    return <div>
      <h1>Settings</h1>
      <h2>Sharing</h2>
      <p>Who is allowed to view your free/busy profile and plan events in your calendar via Liz&#63;</p>
      <select value={this.state.user.share} onChange={this.handleShareSelection}>
        <option value="self">Just me</option>
        <option value="calendar">Everyone with access to my calendar</option>
        <option value="contacts">All my contacts</option>
      </select>
      <h2>Calendars</h2>
      <p>Select the calendars which need to be used for generating your free/busy profile:</p>
      {
          this.state.error ?
              <p className="error">{this.state.error.toString()}</p> :
          this.state.calendars ?
              <CalendarList
                calendars={this.state.calendars}
                selection={selection}
                onChange={this.handleCalendarSelection} /> :
              <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>
          }
      <h2>Availability profile</h2>
      <p>Select one of your calendars as availability profile. Fill this calendar with (repeating) events describing your availability. This can for example be your working hours, like Monday to Friday 9:00-18:00.</p>
      <p>(not yet implemented...)</p>
      <h2>Account</h2>
      <p><button onClick={this.deleteAccount} className="btn btn-danger">Delete account</button>
      </p>
    </div>;
  },

  handleCalendarSelection: function (selection) {
    var user = this.state.user;
    user.calendars = selection;

    this.updateUser(user);
  },

  handleShareSelection: function (event) {
    var user = this.state.user;
    user.share = event.target.value;
console.log('selected', event.target.value, event)

    this.updateUser(user);
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
