/** @jsx React.DOM */

var TimeslotList = React.createClass({
  MAX_TIMESLOTS: 10,

  getInitialState: function () {
    return {
      value: this.props.value
    }
  },

  render: function() {
    var timeslots = this.props.data || [];

    var items = timeslots.slice(0, this.MAX_TIMESLOTS).map(function (timeslot, index) {
      return (<li key={timeslot.start}>
        <label>
          <input type="radio" name="timeslot" value={index + ''} onChange={this.handleChange}
          /> {formatDate(timeslot.start)} {formatTime(timeslot.start)} - {formatTime(timeslot.end)}
        </label>
      </li>);
    }.bind(this));

    return (<RadioGroup
    name="timeslots"
    value={this.state.value}
    ref="timeslots"
    onChange={this.handleChange}
    >
      <ul>{items}</ul>
    </RadioGroup>);
  },

  getCheckedValue: function () {
    return this.refs.timeslots.getCheckedValue();
  },

  setCheckedValue: function (value) {
    return this.refs.timeslots.setCheckedValue(value);
  },

  handleChange: function () {
    if (this.props.onChange) {
      this.props.onChange();
    }
  }
});

