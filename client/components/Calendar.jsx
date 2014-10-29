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
