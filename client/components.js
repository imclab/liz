/** @jsx React.DOM */

var UserMenu = React.createClass({
  render: function() {
    var user = this.state && this.state.user;
    if (!user) {
      return (<div>loading...</div>)
    }
    else if (user.loggedIn) {
      return (<div>{user.name} ({user.email}) <a href="/user/logout">logout</a></div>);
    }
    else {
      return (<div><a href="/user/login">login</a></div>);
    }
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
      var endDate = formatDate(end);
      var startTime = formatTime(start);
      var endTime = formatTime(end);
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
    var data = this.props.data || [];
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
    var calendars = this.props.calendars || {};

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
