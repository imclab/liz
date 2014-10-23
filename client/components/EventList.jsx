/** @jsx React.DOM */

/**
 * Renders Google Calendar events in a table view
 *
 * Usage:
 *
 *     <EventList events={events} />
 *
 */
var EventList = React.createClass({
  render: function() {
    var events = this.props.events || [];

    function getDate(event) {
      return event ? formatHumanDate(event.start.dateTime) : null;
    }

    var rows = events.map(function (event, index) {
      var prevDate = getDate(events[index - 1]);
      var date     = getDate(event);
      var nextDate = getDate(events[index + 1]);

      var className = '';
      if (date != prevDate) className += 'first ';
      if (date != nextDate) className += 'last ';

      return <tr key={event.id}>
        <th className={className + 'nowrap'}>
                {date != prevDate ? date : ''}
        </th>
        <td className={className + 'nowrap'}>
                {formatTime(event.start.dateTime)} &ndash; {formatTime(event.end.dateTime)}
        </td>
        <td className={className}>
          <a href={event.htmlLink}>{event.summary}</a>
        </td>
      </tr>;
    });

    return rows.length > 0  ?
        <table className="events">{rows}</table> :
        <p>(no events)</p>;
  }
});
