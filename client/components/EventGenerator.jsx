/**
 * The generator shows a form where you can specify working hours,
 * and generate availability events from them
 *
 * Usage:
 *
 *   <EventGenerator
 *       calendars={Array}
 *       tag={string}
 *       onCreate={function}
 *   />
 *
 * Where:
 *   - `calendars` is an Array with calendar objects having id, summary, ...
 *   - `tag` is a string like '#available'
 *   - `onCreate` is an optional callback, called when the events have been
 *     generated.
 *
 */
var EventGenerator = React.createClass({
  DAYS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],

  getInitialState: function () {
    var initialState = {
      calendar: null,
      tag: '#available',
      days: {},
      creating: false
    };

    this.DAYS.forEach(function (day) {
      if (day == 'Saturday' || day == 'Sunday') {
        initialState.days[day] = {
          enabled: false,
          start: '',
          end: ''
        };
      }
      else {
        initialState.days[day] = {
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
                checked={this.state.days[day].enabled}
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
              value={this.state.days[day].start}
              disabled={!this.state.days[day].enabled}
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
              value={this.state.days[day].end}
              disabled={!this.state.days[day].enabled}
              onChange={function (event) {
                this.handleChange(day, 'end', event.target.value)
              }.bind(this)}
          />
        </td>
      </tr>
    }.bind(this));

    var calendars = this.props.calendars || [];

    var calendarSelect;
    if (calendars.length > 1) {
      calendarSelect = <p>
        In which calendar do you want to create availability events&#63;
        <Selectize
            value={this.state.calendar}
            options={calendars}
            placeholder="Select a calendar..."
            onChange={this.handleCalendarChange}
        />
      </p>;
    }
    else if (calendars.length == 1) {
      calendarSelect = <p>
        The events will be generated in calendar <b title={calendars[0].value}>{calendars[0].text}</b>
      </p>;
    }
    else {
      calendarSelect = <p className="error">Error: no calendar selected</p>
    }

    return <div>
      <p>When are you available&#63;</p>
      <table className="availability"><tbody>
      {days}
      </tbody></table>
      {calendarSelect}
      <p>
        <button
            className="btn btn-success"
            onClick={this.create}
            disabled={this.state.creating}
        >Generate events</button> {
          this.state.creating ?
              <span>creating <img className="loading" src="img/ajax-loader.gif" /></span> :
              <span></span>
        }
      </p>
    </div>
  },

  handleChange: function (day, field, value) {
    var state = {};
    state.days = _.extend({}, this.state.days);
    state.days[day][field] = value;

    this.setState(state);
  },

  handleCalendarChange: function (value) {
    this.setState({
      calendar: value
    });
  },

  create: function () {
    var calendars = this.props.calendars || [];
    var calendar = calendars.length == 1 ? calendars[0].value : this.state.calendar;

    if (!calendar) {
      return alert('Error: No calendar selected');
    }

    var days = Object.keys(this.state.days)
        .filter(function (day) {
          return this.state.days[day].enabled;
        }.bind(this))
        .map(function (day) {
          return _.extend({day: day}, this.state.days[day]);
        }.bind(this));

    var body = {
      "tag": this.props.tag,           // for example '#availability'
      "calendar": calendar,
      //"createCalendar": NEW_CALENDAR_NAME,
      "zone": moment().zone(),       // for example -60 or '-01:00' or '+08:00'
      "days": days
    };

    // send request to the server
    this.setState({creating: true});
    ajax.post('/profiles/generate', body)
      .then(function (events) {
        console.log('availability events generated', events);

        this.setState({creating: false});

        if (typeof this.props.onCreate == 'function') {
          this.props.onCreate(events);
        }
      }.bind(this))
      .catch(function (err) {
        this.setState({creating: false});

        console.log(err);
        alert(err);
      }.bind(this));
  }
});
