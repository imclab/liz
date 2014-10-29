var TimeslotList = React.createClass({
  MAX_TIMESLOTS: 10,

  getInitialState: function () {
    return {
      timeslots: this.props.timeslots || [],
      value: this.props.value || null
    }
  },

  render: function() {
    var me = this;
    var timeslots = this.state.timeslots;

    function getDate(timeslot) {
      return timeslot ? formatHumanDate(timeslot.start) : null;
    }

    var rows = timeslots.slice(0, 10).map(function (timeslot, index) {
      var prevDate = getDate(timeslots[index - 1]);
      var date     = getDate(timeslot);
      var nextDate = getDate(timeslots[index + 1]);

      var className = '';
      if (date != prevDate) className += 'first ';
      if (date != nextDate) className += 'last ';

      var selected = (index == me.state.value); // TODO: use this.state.value instead, didn't yet work for some reason

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
          <button className={'btn ' + (selected ? ' btn-primary' : ' btn-default')} onClick={onClick}>
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
  }
});

