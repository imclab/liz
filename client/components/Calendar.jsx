/**
 * A calendar entry for a CalendarList
 *
 * Usage:
 *
 *   <Calendar calendar={{id: string, foregroundColor: string, backgroundColor: string}} />
 *
 * Where:
 * - `calendar` an object with the calendar id as property, and additional
 *   properties foregroundColor and backgroundColor.
 */
var Calendar = React.createClass({
  render: function() {
    var calendar = this.props.calendar;
    var style = {
      'backgroundColor': calendar.backgroundColor,
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
