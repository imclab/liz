/** @jsx React.DOM */

var SettingsPage = React.createClass({
  getInitialState: function () {
    var me = this;
    ajax.get('/calendar/')
        .then(function (calendars) {
          console.log('calendars', calendars);
          me.setState({calendars: calendars.items});
        });

    return {calendars: []};
  },
  render: function () {
    var calendars = this.state.calendars;

    return (
        <div>
          <h1>Settings</h1>
          <CalendarList calendars={calendars} />
          </div>
        )
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
