/**
 * A calendar entry for a CalendarList
 *
 * Usage:
 *
 *   <AvailabilityWizard
 *       ref="wizard"
 *       calendars={this.state.calendarList}
 *       defaultCalendar={this.state.defaultCalendar}
 *   />
 *
 * Where:
 *   - `calendars` is an Array with calendar objects having id, summary, ...
 *   - `defaultCalendar` is the calendar to be selected by default.
 *
 * To show the wizard:
 *
 *   this.refs.wizard.show();
 *
 */
var AvailabilityWizard = React.createClass({
  DAYS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],

  getInitialState: function () {
    var initialState = {
      calendar: null,
      tag: '#available'
    };

    this.DAYS.forEach(function (day) {
      if (day == 'Saturday' || day == 'Sunday') {
        initialState[day] = {
          enabled: false,
          start: '',
          end: ''
        };
      }
      else {
        initialState[day] = {
          enabled: true,
          start: '09:00',
          end: '17:00'
        };
      }
    });

    return initialState;
  },

  render: function () {
    var days = this.DAYS.map(function (day) {
      return <tr key={day}>
          <td>
            <label><input
                type="checkbox"
                checked={this.state[day].enabled}
                onChange={function (event) {
                  this.handleChange(day, 'enabled', event.target.checked)
                }.bind(this)}
            /> {day}</label>
          </td>
        <td>
          <input
              type="text"
              className="form-control"
              title="Start time"
              value={this.state[day].start}
              onChange={function (event) {
                this.handleChange(day, 'start', event.target.value)
              }.bind(this)}
          />
        </td>
        <td>
          <input
              type="text"
              className="form-control"
              title="End time"
              value={this.state[day].end}
              onChange={function (event) {
                this.handleChange(day, 'end', event.target.value)
              }.bind(this)}
          />
        </td>
      </tr>
    }.bind(this));

    var calendars = this.props.calendars || [];
    var calendarOptions = calendars.map(function(calendar) {
      return {
        value: calendar.id,
        text: calendar.summary
      }
    });
    var calendar = this.state.calendar == null ? this.props.defaultCalendar : this.state.calendar;

    return <div className="modal" ref="wizard">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
            <h4 className="modal-title">Availability profile</h4>
          </div>
          <div className="modal-body">
            <p>Generate an availability profile in one of your calendars.</p>
            <h5>Availability</h5>
            <p>Which days are you available&#63;</p>
            <table className="availability"><tbody>
            {days}
            </tbody></table>

            <h5>Calendar</h5>
            <p>In which calendar do you want to create the availability profile&#63;</p>
            <Selectize
                value={calendar}
                options={calendarOptions}
                placeholder="Select a calendar..."
                onChange={this.handleCalendarChange}
            />

            <h5>Tag</h5>
            <p>Which tag do you want to give the availability events&#63;</p>
            <input
                type="text"
                className="form-control"
                title="Availability tag"
                value={this.state.tag}
                placeholder="Enter a tag like '#available'"
                onChange={this.handleTagChange}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-success" onClick={this.create}>Create</button>
          </div>
        </div>
      </div>
    </div>;
  },

  show: function () {
    // TODO: reset the state before showing?
    var wizard = this.refs.wizard.getDOMNode();
    $(wizard).modal('show');
  },

  handleChange: function (day, field, value) {
    var state = {};
    state[day] = _.extend({}, this.state[day]);
    state[day][field] = value;

    this.setState(state);
  },

  handleCalendarChange: function (value) {
    this.setState({
      calendar: value
    });
  },

  handleTagChange: function (event) {
    this.setState({tag: event.target.value})
  },

  create: function () {
    alert('create...');
    // TODO: create the profile
  }
});
