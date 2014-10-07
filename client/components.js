/** @jsx React.DOM */

//var Menu = React.createClass({
//  render: function() {
//    var user = this.state && this.state.user;
//    if (!user) {
//      return (<div>loading...</div>)
//    }
//    else if (user.loggedIn) {
//      return (<div><img src={user.picture} className="user-icon"></img> {user.name} ({user.email}) <a href="/user/logout">logout</a></div>);
//    }
//    else {
//      return (<div><a href="/user/login">login</a></div>);
//    }
//  }
//});

var Menu = React.createClass({
  render: function() {

    // <img src={user.picture} className="user-icon"></img>

    var login;
    var user = this.state && this.state.user;
    if (!user) {
      // TODO: non clickable loading message          <p class="navbar-text navbar-right">loading...</p>
      login = (
          <ul className="nav navbar-nav navbar-right">
            <li>
            <a>loading...</a>
            </li>
          </ul>
          );
    }
    else if (user.loggedIn) {
      var title = 'Signed in as ' + user.name + ' (' + user.email + ')';
      login = (
          <ul className="nav navbar-nav navbar-right">
            <li className="dropdown">
              <a href="#" className="dropdown-toggle" data-toggle="dropdown"><span title={title}>{user.name}</span> <span className="caret"></span>
              </a>
              <ul className="dropdown-menu" role="menu">
                <li><a href="/user/signout">Sign out</a></li>
              </ul>
            </li>
          </ul>
          );
    }
    else {
      login = (
          <ul className="nav navbar-nav navbar-right">
            <li>
              <a href="/user/signin">Sign in</a>
            </li>
          </ul>
          );
    }

    return (
        <nav className="navbar navbar-default" role="navigation">
          <div className="container-fluid">
            <div className="navbar-header">
              <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">
                <span className="sr-only">Toggle navigation</span>
                <span className="icon-bar"></span>
                <span className="icon-bar"></span>
                <span className="icon-bar"></span>
              </button>
            </div>

            <div className="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
              <ul className="nav navbar-nav">
                <li className="active"><a href="?page=home">Home</a></li>
                <li><a href="?page=settings">Settings</a></li>
              </ul>
              {login}
            </div>
          </div>
        </nav>
        );
  }
});

var Calendar = React.createClass({
  render: function() {
    var calendar = this.props.calendar;
    var style = {
      'background-color': calendar.backgroundColor,
      color: calendar.foregroundColor
    };

    return (<div className="calendar"
    style={style}>{calendar.summary}</div>);
  }
});

var CalendarList = React.createClass({
  getInitialState: function () {
    return {calendars: []}
  },
  render: function() {
    var calendars = this.props.calendars.map(function (calendar) {
      return (<Calendar calendar={calendar} key={calendar.id}/>)
    });

    return (<div>{calendars}</div>)
  }
});

var Settings = React.createClass({
  getInitialState: function () {
    return {
      busy: [],
      availability: null
    }
  },
  render: function() {
    return (
        <div>

        </div>
        )
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
