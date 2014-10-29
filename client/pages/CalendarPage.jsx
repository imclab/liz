var CalendarPage = React.createClass({
  getInitialState: function () {
    var email = this.props.user && this.props.user.email;
    if (email) {
      this.loadEvents(email);
    }

    return {
      user: this.props.user || null,
      loading: email != undefined,
      events: null,
      error: null
    };
  },

  render: function () {
    var events = this.state.events || [];
    var contents;

    if (this.state.error) {
      contents = <p className="error">{this.state.error.toString()}</p>
    }
    else if (this.state.loading) {
      contents = <p>Loading calendar events <img className="loading" src="img/ajax-loader.gif" /></p>;
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
          this.setState({
            error: err,
            loading: false
          });
          console.log(err);
        }.bind(this));
  }
});
