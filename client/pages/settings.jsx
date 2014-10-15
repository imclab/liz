/** @jsx React.DOM */

var SettingsPage = React.createClass({
  getInitialState: function () {
    ajax.get('/calendar/')
        .then(function (calendars) {
          console.log('calendars', calendars);
          this.setState({calendars: calendars.items || []});
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        });

    return {
      calendars: []
    };
  },

  render: function () {
    var calendars = this.state.user && this.state.user.calendars || [];

    return (
        <div>
          <h1>Settings</h1>
          <h2>Calendars</h2>
          <p>Select the calendars which need to be used for generating a free/busy profile:</p>
          <CalendarList
            calendars={this.state.calendars}
            selection={calendars}
            onChange={this.handleChange} />
          <h2>Availability profile</h2>
          <p>Select one of your calendars as availability profile. Fill this calendar with (repeating) events describing your availability. This can for example be your working hours, like Monday to Friday 9:00-18:00.</p>
          <p>(not yet implemented...)</p>
          <h2>Account</h2>
          <p><button onClick={this.deleteAccount} className="btn btn-danger">Delete account</button>
          </p>
        </div>
        )
  },

  handleChange: function (selection) {
    console.log('selected calendars:', selection);
    ajax.put('/user/', {calendars: selection})
        .then(function (user) {
          console.log('user', user);
          // TODO: apply new user via setState? Propagate back to the main app?
          this.setState({user: user});
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        });
  },

  deleteAccount: function () {
    if (confirm ('Are you sure you want to delete your account?\n\nThis action cannot be undone.')) {
      ajax.del('/user/')
          .then(function () {
            // go to home
            location.href = '/';
          })
          .catch(function (err) {
            console.log('Error', err);
          })
    }
  }
});
