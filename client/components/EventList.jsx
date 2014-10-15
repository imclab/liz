/** @jsx React.DOM */

var EventList = React.createClass({
  render: function() {
    var events = this.props.events || [];

    // group the calendar events per day
    var dates = {};
    events.forEach(function (event) {
      var date = formatDate(event.start.dateTime);
      if (!dates[date]) {
        dates[date] = [event];
      }
      else {
        dates[date].push(event);
      }
    });

    var rows = Object.keys(dates)
        .sort()
        .reduce(function (rows, date) {
          var events = dates[date];

          var items = events.map(function (item, index) {
            var className = '';
            if (index == 0) className += 'first ';
            if (index == events.length - 1) className += 'last ';

            return (<tr key={item.id}>
              <th className={className + 'nowrap'}>
                {index == 0 ? date : ''}
              </th>
              <td className={className + 'nowrap'}>
                {formatTime(item.start.dateTime)}&nbsp;&ndash;&nbsp;{formatTime(item.end.dateTime)}
              </td>
              <td className={className}>
                <a href={item.htmlLink}>{item.summary}</a>
              </td>
            </tr>);
          });

//          var day = moment(date).format('dddd');
//          if (date == formatDate(moment())) day = 'Today';
//          if (date == formatDate(moment().add(1, 'day'))) day = 'Tomorrow';

          return rows.concat(items);
        }, []);

    return (
        <table className="events">
          {rows}
        </table>);
  }
});
