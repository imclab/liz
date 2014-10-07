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
    var freeBusy = this.state.freeBusy;
    return (
        <div>
        <h1>Events</h1>
        <EventList events={events} />
        <h1>Busy</h1>
        <FreeBusyList freeBusy={freeBusy} />
        </div>
        );
  },

  loadEvents: function (calendarId) {
    var me = this;
    return ajax.get('/calendar/' + calendarId)
        .then(function (events) {
          console.log('events', events);
          me.setState({events: events.items});
        })
  },

  loadFreeBusy: function (calendarId) {
    var me = this;
    return ajax.get('/freeBusy/' + calendarId)
        .then(function (freeBusy) {
          console.log('freeBusy', freeBusy);
          me.setState({freeBusy: freeBusy.calendars});
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
    var calendars = this.props.freeBusy || {};

    function buildItems(items) {
      return items.map(function (item) {
        return (<FreeBusy data={item} key={item.start}/>)
      });
    }

    var items = [];
    for (var calendarId in calendars) {
      if (calendars.hasOwnProperty(calendarId)) {
        items = items.concat(buildItems(calendars[calendarId].busy));
      }
    }

    return (<div>{items}</div>)
  }
});

