/** @jsx React.DOM */

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
