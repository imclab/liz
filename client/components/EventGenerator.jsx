/**
 * The generator shows a form where you can specify working hours,
 * and generate availability events from them
 *
 * Usage:
 *
 *   <EventGenerator
 *       calendars={Array}
 *       calendar={string}
 *       onCreate={function}
 *   />
 *
 * Usage:
 *
 *   generator.show({
 *     calendars: [...],
 *     calendar: '...',
 *     save: function (props) {
 *       // props contains:
 *       //   props.calendar: string
 *       //   props.tag: string
 *       //   props.newCalendar: boolean
 *
 *       generator.hide();
 *     },
 *     cancel: function  (optional)
 *   });
 *
 *   generator.hide();
 *
 * Where:
 *   - `calendars` is an Array with calendar objects having id, summary, ...
 *   - `calendar` the initially selected calendar
 *   - `tag` is a string like '#available'
 *   - `onCreate` is an optional callback, called when the events have been
 *     generated.
 */
var EventGenerator = React.createClass({
  DAYS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],

  getInitialState: function () {
    var initialState = {
      existingCalendar: '',
      newCalendar: 'Availability',
      createCalendar: false,
      tag: '#available',
      days: {},

      saving: false,
      visible: false,

      save: null,    // callback function
      cancel: null   // callback function
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
    return <div className="modal profile" ref="profile">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <button className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
            <h4 className="modal-title">Availability event generator</h4>
          </div>
          <div className="modal-body">
            <div>
              {this.renderCalenderSelection()}
              {this.renderDaySelection()}
              {this.renderTagSelection()}
            </div>
          </div>
          <div className="modal-footer">
              {
                this.state.saving ?
                  <span>creating <img className="loading" src="img/ajax-loader.gif" /></span> :
                  <span></span>
              } <
             button className="btn btn-default" onClick={this.cancel}>Cancel</button>
            <button
                className="btn btn-success"
                onClick={this.create}
                disabled={this.state.saving}
            >Generate events</button>
          </div>
        </div>
      </div>
    </div>;
  },

  renderCalenderSelection: function () {
    var calendars = this.state.calendars || [];

    if (calendars.length > 1) {
      return <p>
        <p>In which calendar do you want to create availability events&#63;</p>

        <table className='calendar-selection'>
          <colgroup>
            <col width="150px" />
          </colgroup>
          <tbody>
            <tr>
              <td>
                <label><input
                    type="radio"
                    checked={this.state.createCalendar == true}
                    disabled={this.state.saving}
                    onChange={function () {
                      this.setState({createCalendar: true});
                    }.bind(this)}
                />&nbsp;New&nbsp;calendar</label>
              </td>
              <td>
                <input
                    type="text"
                    disabled={this.state.saving}
                    className="form-control"
                    value={this.state.newCalendar}
                    onChange={this.handleNewCalendarChange}
                />
              </td>
            </tr>
            <tr>
              <td>
                <label><input
                    type="radio"
                    checked={this.state.createCalendar == false}
                    disabled={this.state.saving}
                    onChange={function () {
                      this.setState({createCalendar: false});
                    }.bind(this)}
                />&nbsp;Existing&nbsp;calendar</label>
              </td>
              <td>
                <Selectize
                    value={this.state.existingCalendar}
                    disabled={this.state.saving}
                    options={calendars}
                    placeholder="Select a calendar..."
                    onChange={this.handleCalendarChange}
                />
              </td>
            </tr>
          </tbody>
        </table>


      </p>;
    }
    else if (calendars.length == 1) {
      return <p>
        The events will be generated in calendar <b title={calendars[0].value}>{calendars[0].text}</b>
      </p>;
    }
    else {
      return <p className="error">Error: no calendar available</p>
    }
  },

  renderDaySelection: function () {
    var days = this.DAYS.map(function (day) {
      return <tr key={day}>
        <td>
          <label><input
              type="checkbox"
              checked={this.state.days[day].enabled}
              disabled={this.state.saving}
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
              disabled={!this.state.days[day].enabled || this.state.saving}
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
              disabled={!this.state.days[day].enabled || this.state.saving}
              onChange={function (event) {
                this.handleChange(day, 'end', event.target.value)
              }.bind(this)}
          />
        </td>
      </tr>
    }.bind(this));

    return <div>
      <p>When are you available&#63;</p>
      <table className="days"><tbody>
      {days}
      </tbody></table>
    </div>;
  },

  renderTagSelection: function () {
    return <div>
      <p>
        Which tag do you want to give the availability events&#63;&nbsp;
      {
          this.renderPopover('Tag', 'All events having the specified tag as title will be used to determine your availability (typically your working hours)')
          }
      </p>
      <input
          type="text"
          disabled={this.state.saving}
          className="form-control"
          title="Availability tag"
          value={this.state.tag}
          placeholder="Enter a tag like '#available'"
          onChange={this.handleTagChange}
      />
    </div>;
  },

  renderPopover: function (title, content, placement) {
    return <a href="#" onClick={function (event) {event.preventDefault()}}>
      <span
          data-toggle="popover"
          data-placement={placement || 'top'}
          title={title}
          data-content={content}
          className="glyphicon glyphicon-info-sign"
          aria-hidden="true"
      ></span>
    </a>
  },

  handleChange: function (day, field, value) {
    var state = {};
    state.days = _.extend({}, this.state.days);
    state.days[day][field] = value;

    this.setState(state);
  },

  handleTagChange: function (event) {
    this.setState({tag: event.target.value});
  },

  handleCalendarChange: function (value) {
    this.setState({
      existingCalendar: value,
      createCalendar: false
    });
  },

  handleNewCalendarChange: function (event) {
    this.setState({
      newCalendar: event.target.value,
      createCalendar: true
    });
  },

  create: function () {
    var calendars = this.state.calendars || [];
    var calendar;

    if (this.state.createCalendar) {
      calendar = this.state.newCalendar;
    }
    else {
      calendar = (calendars.length == 1) ? calendars[0].value : this.state.existingCalendar;
    }

    if (!calendar) {
      return alert('Error: No calendar selected');
    }
    if (!this.state.tag) {
      return alert('Error: No tag entered');
    }

    var days = Object.keys(this.state.days)
        .filter(function (day) {
          return this.state.days[day].enabled;
        }.bind(this))
        .map(function (day) {
          return _.extend({day: day}, this.state.days[day]);
        }.bind(this));

    var body = {
      "tag": this.state.tag,           // for example '#availability'
      "zone": moment().zone(),       // for example -60 or '-01:00' or '+08:00'
      "days": days
    };

    if (this.state.createCalendar) {
      body.createCalendar = calendar;
    }
    else {
      body.calendar = calendar;
    }

    // send request to the server
    this.setState({saving: true});
    ajax.post('/profiles/generate', body)
      .then(function (response) {
        console.log('availability events generated', response);

        this.setState({saving: false});

        if (typeof this.state.save == 'function') {
          this.state.save({
            calendar: response.calendar, // calendarId
            name: calendar,              // calendar name (or id)
            tag: this.state.tag,
            events: response.events
          });
        }
      }.bind(this))
      .catch(function (err) {
        this.setState({saving: false});

        console.log(err);
        alert(err);
      }.bind(this));
  },

  show: function (options) {
    this.setState(_.extend({visible: true}, options));
  },

  hide: function () {
    this.setState({visible: false});
  },

  cancel: function () {
    this.hide();

    if (typeof this.state.cancel === 'function') {
      this.state.cancel();
    }
  },

  componentDidMount: function () {
    // initialize all popovers
    $('[data-toggle="popover"]').popover();

    this.updateVisibility();
  },

  componentDidUpdate: function () {
    // initialize all popovers
    $('[data-toggle="popover"]').popover();

    this.updateVisibility();
  },

  updateVisibility: function () {
    if (this._modal == null) {
      this._modal = this._createModal();
    }

    // show/hide the modal
    this._modal.modal(this.state.visible ? 'show' : 'hide');
  },

  _modal: null, // bootstrap modal thingy

  _createModal: function () {
    var elem = this.refs.profile.getDOMNode();

    return $(elem)

        // prevent conflict with pressing ESC in dropdowns
        .modal({keyboard: false})

        // attach listener on hide
        .on('hide.bs.modal', function (error) {
          if (this.state.visible) {
            this.cancel();
          }
        }.bind(this));
  }
});
