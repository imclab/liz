/**
 * Create a list with selectable calendars
 *
 * Usage:
 *
 *   <CalendarList calendars={Array} selection={Array} onChange={function} />
 *
 * Where:
 * - `calendars` is an array with calendar objects. A calendar object
 *   contains properties id (string), foregroundColor (string, and
 *   backgroundColor (string).
 * - `selection` is an array with strings, contains the ids of the selected
 *   calendars
 * - `onChange` is a callback function called when the selection is changed.
 *   The function is called with the new selection as argument.
 */
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

    return (<CheckboxGroup
        name="calendars"
        className="calendars"
        value={this.props.selection}
        ref="calendars"
        onChange={this.handleChange}
    >{calendars}</CheckboxGroup>);
  },

  handleChange: function () {
    if (typeof this.props.onChange === 'function') {
      var selected = this.refs.calendars.getCheckedValues();
      this.props.onChange(selected);
    }
  }
});
