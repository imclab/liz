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
    return (
        <div>
        <h1>Calendar events</h1>
        <EventList events={events} />
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

var Event = React.createClass({
  render: function() {
    var item = this.props.data;
    var startStr = item.start && (item.start.dateTime || item.start.date);
    var endStr = item.end && (item.end.dateTime || item.end.date);
    var start = startStr ? moment(startStr) : null;
    var end = endStr ? moment(endStr) : null;
    var date;

    if (start && end) {
      var startDate = formatDate(start);
      var endDate   = formatDate(end);
      var startTime = formatTime(start);
      var endTime   = formatTime(end);
      if (startDate == endDate) {
        date = (<p>{startDate}, {startTime} - {endTime}</p>)
      }
      else {
        date = (<p>{startDate} {startTime} - {endDate} {endTime}</p>)
      }
    }
    else {
      date = (<p>&#63;</p>)
    }

    return (
        <div>
          <p>
            <b>{item.summary}</b><br/>
          </p>
          {date}
        </div>
        );
  }
});

var EventList = React.createClass({
  render: function() {
    var data = this.props.events || [];
    var items = data.map(function (item) {
      return (<Event data={item} key={item.id}/>)
    });
    return (<div>{items}</div>)
  }
});
