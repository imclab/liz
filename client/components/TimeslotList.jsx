/** @jsx React.DOM */

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

    // group the timeslots per day
    var dates = {};
    timeslots.forEach(function (timeslot) {
      var date = formatDate(timeslot.start);
      if (!dates[date]) {
        dates[date] = [timeslot];
      }
      else {
        dates[date].push(timeslot);
      }
    });

    var globalIndex = 0;
    var rows = Object.keys(dates)
        .sort()
        .reduce(function (rows, date) {
          var timeslots = dates[date];

          var items = timeslots.map(function (item, index) {
            var className = '';
            if (index == 0) className += 'first ';
            if (index == timeslots.length - 1) className += 'last ';

            var itemIndex = globalIndex;
            var selected = (globalIndex == me.state.value); // TODO: use this.state.value instead
            globalIndex++;

            var onClick = function () {
              me.setValue(itemIndex);

              if (me.props.onChange) {
                me.props.onChange(index);
              }
            };

            // TODO: change buttons into radio boxes
            return (<tr key={itemIndex}>
              <th className={className}>
                {index == 0 ? moment(date).format('ddd DD MMM') : ''}
              </th>
              <td className={className}>
                  <button className={'btn ' + (selected ? ' btn-primary' : ' btn-default')} onClick={onClick}>
                    {formatTime(item.start)} &ndash; {formatTime(item.end)}
                  </button>
              </td>
            </tr>);
          });

          return rows.concat(items);
        }.bind(this), [])
        .splice(0, 10);

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

