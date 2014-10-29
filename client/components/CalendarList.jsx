var CalendarList = React.createClass({
  getInitialState: function () {
    return {
      calendars: [],
      selection: []
    }
  },

  render: function() {
    var calendars = this.props.calendars.map(function (calendar) {
      return (<Calendar calendar={calendar} key={calendar.id}/>)
    });

    // TODO: show a loading message while loading
    return (
        <CheckboxGroup
        name="calendars"
        className="calendars"
        value={this.props.selection}
        ref="calendars"
        onChange={this.handleChange}
        >{calendars}</CheckboxGroup>
        )
  },

  handleChange: function () {
    if (typeof this.props.onChange === 'function') {
      var selected = this.refs.calendars.getCheckedValues();
      this.props.onChange(selected);
    }
  }
});
