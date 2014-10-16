/** @jsx React.DOM */

var SettingsPage = React.createClass({
  getInitialState: function () {
    // load the list with calendars
    ajax.get('/calendar/')
        .then(function (calendars) {
          console.log('calendars', calendars);
          this.setState({calendars: calendars.items || []});
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        });

    return {
      selection: this.props.selection || [],
      calendars: null
    };
  },

  render: function () {
    return <div>
      <h1>Settings</h1>
      <h2>Calendars</h2>
      <p>Select the calendars which need to be used for generating a free/busy profile:</p>
      {
          this.state.calendars ?
              <CalendarList
                calendars={this.state.calendars}
                selection={this.state.selection}
                onChange={this.handleChange} /> :
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

  handleChange: function (selection) {
    this.setState({selection: selection});

    // propagate the selection to the parent component
    if (typeof this.props.onChange === 'function') {
      this.props.onChange(selection)
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
            console.log('Error', err);
          })
    }
  }
});
