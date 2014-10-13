/** @jsx React.DOM */

var HomePage = React.createClass({
  getInitialState: function () {
    return {};
  },

  componentWillUpdate: function (nextProps, nextState) {
    var email = nextState.user && nextState.user.email;
    if (email && !nextState.events) {
      nextState.events = [];
      this.loadEvents(email);
    }
    if (email && !nextState.freeBusy) {
      nextState.freeBusy = [];
      this.loadFreeBusy(email);
    }
  },

  render: function () {
    var events = this.state.events;
    var busy = this.state.busy;
    return (
        <div>
        <h1>Events</h1>
        <EventList events={events} />
        <h1>Busy</h1>
        <FreeBusyList busy={busy} />
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
  },

  loadFreeBusy: function (calendarId) {
    return ajax.get('/freeBusy/' + calendarId)
        .then(function (freeBusy) {
          console.log('freeBusy', freeBusy);
          this.setState({busy: freeBusy.busy || []});
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        })
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

var FreeBusy = React.createClass({
  render: function() {
    var interval = this.props.data;

    return (<p>{interval.start} - {interval.end}</p>);
  }
});

var FreeBusyList = React.createClass({
  render: function() {
    var busy = this.props.busy || [];

    var items = busy.map(function (interval) {
      return (<FreeBusy data={interval} key={interval.start}/>)
    });

    return (<div>{items}</div>)
  }
});

