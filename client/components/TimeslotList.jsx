/**
 * Renders a list with timeslots
 *
 * Usage:
 *
 *   <TimeslotList
 *       timeslots={Array.<{start: string, end: string}>}
 *       value={Number}
 *       onChange={function}
 *       />
 *
 * Where:
 * - `timeslots` is an array with available timeslots. Every timeslot is an
 *   object with properties `start` and `end`, both being ISO date strings.
 * - `value` is a number with the index of the selected timeslot
 * - `onChange` is a callback function, called with the index of the newly
 *   selected timeslot as argument when the selection has changed.
 *
 * Methods:
 *
 * - `getValue()`         Returns the index of the currently selected timeslot
 * - `setValue(value)`    Apply a new selection, value is the index of the
 *                        timeslot to be selected.
 */
var TimeslotList = React.createClass({
  getInitialState: function () {
    return {
      value: this.props.value || 0
    }
  },

  render: function() {
    var me = this;
    var timeslots = this.props.timeslots || [];

    function getDate(timeslot) {
      return timeslot ? formatHumanDate(timeslot.start) : null;
    }

    var rows = timeslots.map(function (timeslot, index) {
      var prevDate = getDate(timeslots[index - 1]);
      var date     = getDate(timeslot);
      var nextDate = getDate(timeslots[index + 1]);

      var className = '';
      if (date != prevDate) className += 'first ';
      if (date != nextDate) className += 'last ';

      var selected = (index == this.state.value);

      var onClick = function () {
        me.setValue(index);

        if (me.props.onChange) {
          me.props.onChange(index);
        }
      };

      // TODO: change buttons into radio boxes
      return (<tr key={index}>
        <th className={className}>
                {date != prevDate ? date : ''}
        </th>
        <td className={className}>
          <button ref={'value' + index} className={'btn ' + (selected ? ' btn-primary' : ' btn-default')} onClick={onClick}>
                    {formatTime(timeslot.start)} &ndash; {formatTime(timeslot.end)}
          </button>
        </td>
      </tr>);
    }.bind(this));

    return (
        <table className="events">
          {rows}
        </table>);
  },

  handleSelect: function (index) {
    this.setValue(index);

    if (this.props.onChange) {
      this.props.onChange(index);
    }
  },

  getValue: function () {
    return this.state.value;
  },

  setValue: function (value) {
    this.setState({
      value: value
    });
  },

  componentDidMount: function() {
    this.focusSelected();
  },

  componentDidUpdate: function (prevProps, prevState) {
    this.focusSelected()
  },

  focusSelected: function () {
    var value = this.state.value;
    var elem = this.refs['value' + value];
    elem && elem.getDOMNode().focus();
  }
});

