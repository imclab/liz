/**
 * Renders Google Calendar events in a table view
 *
 * Usage:
 *
 *     <EventList events={events} />
 *
 * Where:
 *
 * - `events` is an Array with event objects. The events are Google Calendar
 *   events with the following structure:
 *
 *       {
 *         id: string,
 *         summary: string,
 *         start: {
 *           dateTime: string
 *         },
 *         end: {
 *           dateTime: string
 *         },
 *         htmlLink: string,
 *         ...
 *       }
 *
 *   The full structure is described in the Google Calendar API:
 *   https://developers.google.com/google-apps/calendar/v3/reference/events
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
