/** @jsx React.DOM */

var CalendarPage = React.createClass({
  getInitialState: function () {
    // TODO: not nice having to do tests whether to run loadEvents in two places
    var email = this.props.user && this.props.user.email;
    if (email) {
      this.loadEvents(email);
    }

    return {
      user: this.props.user || null,
      loading: email != undefined,
      events: null
    };
  },

  componentWillUpdate: function (nextProps, nextState) {
    // TODO: not nice having to do tests whether to run loadEvents in two places
    var email = nextProps.user && nextProps.user.email;
    if (email && !nextState.events) {
      nextState.loading = true;
      this.loadEvents(email);
    }
  },

  render: function () {
    var events = this.state.events || [];
    var contents;

    if (this.state.loading) {
      contents = <p>Loading calendar events... <img className="loading" src="img/ajax-loader.gif" /></p>;
    }
    else {
      contents = <EventList events={events} />;
    }

    return <div>
      <h1>Calendar events</h1>
      {contents}
    </div>;
  },

  loadEvents: function (calendarId) {
    return ajax.get('/calendar/' + calendarId)
        .then(function (events) {
          console.log('events', events);
          this.setState({
            loading: false,
            events: events.items || []
          });
        }.bind(this))
        .catch(function (err) {
          // TODO: show error on screen
          this.setState({loading: false});
          console.log('Error', err);
        }.bind(this));
  }
});
