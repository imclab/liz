/** @jsx React.DOM */

var CalendarPage = React.createClass({
  getInitialState: function () {
    return {};
  },

  componentWillUpdate: function (nextProps, nextState) {
    var email = nextState.user && nextState.user.email;
    if (email && !nextState.events) {
      nextState.events = [];
      this.loadEvents(email);
    }
  },

  render: function () {
    var events = this.state.events;
    var contents;

    if (events != null) {
      contents = (<EventList events={events} />);
    }
    else {
      contents = (<p>Loading calendar events... <img class="loading" src="img/ajax-loader.gif" /></p>);
    }

    return (
        <div>
          <h1>Calendar events</h1>
          {contents}
        </div>
        );
  },

  loadEvents: function (calendarId) {
    return ajax.get('/calendar/' + calendarId)
        .then(function (events) {
          console.log('events', events);
          this.setState({events: events.items || []});
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        });
  }
});
