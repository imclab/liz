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
          <h1>Calendars</h1>
          <p>Select the calendars which need to be used for generating a free/busy profile:</p>
          <CalendarList
            calendars={this.state.calendars}
            selection={calendars}
            onChange={this.handleChange} />
          <h1>Availability profile</h1>
          <p>Select one of your calendars as availability profile. Fill this calendar with (repeating) events describing your availability. This can for example be your working hours, like Monday to Friday 9:00-18:00.</p>
          <p>(not yet implemented...)</p>
          <h1>Delete account</h1>
          <p><button onClick={this.deleteAccount} value="Delete account" className="btn btn-danger">Delete account</button>
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

var CalendarList = React.createClass({
  getInitialState: function () {
    return {
      calendars: [],
      selection: []
    }
  },

  render: function() {
    var calendars = this.props.calendars.map(function (calendar) {
      return (<Calendar calendar={calendar} key={calendar.id}/>)
    });

    return (
          <CheckboxGroup
          name="calendars"
          className="calendars"
          value={this.props.selection}
          ref="calendars"
          onChange={this.handleChange}
          >{calendars}</CheckboxGroup>
        )
  },

  handleChange: function () {
    if (typeof this.props.onChange === 'function') {
      var selected = this.refs.calendars.getCheckedValues();
      this.props.onChange(selected);
    }
  }
});

var Calendar = React.createClass({
  render: function() {
    var calendar = this.props.calendar;
    var style = {
      'background-color': calendar.backgroundColor,
      color: calendar.foregroundColor
    };
    var name = this.props.name || 'calendar[]';

    return (
        <div className="calendar-item">
          <label>
            <input type="checkbox" name={name} value={calendar.id} /> <div className="calendar-color" style={style}></div> {calendar.summary}
          </label>
        </div>
        );
  }
});
