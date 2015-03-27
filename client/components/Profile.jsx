/**
 * Create a modal to edit a profile
 *
 * Create:
 *
 *   <Profile ref="profile" />
 *
 * Use:
 *
 *   profile.show({
 *     profile: {
 *       user: ...,
 *       calendars: ...,
 *       tag: ...,
 *       role: 'group' | 'individual',
 *       group: ...
 *     },
 *     save: function(profile: Object)
 *     cancel: function (optional)
 *   });
 *
 *   profile.hide();
 */
var Profile = React.createClass({
  getInitialState: function () {
    // TODO: replace loading all groups with smart auto completion, loading groups matching current search
    return {
      visible: false,
      saving: false,

      save: null,   // callback function
      cancel: null, // callback function

      profile: {
        user: '',
        calendars: '', // TODO: remove
        busy: '',       // calendar id's for busy events
        available: '',  // calendar id for availability events
        tag: '',
        role: '',
        group: ''
      },

      calendarList: [],
      groupsList: []
    };
  },

  render: function () {
    return <div>
      <EventGenerator ref="generator" />
      <div className="modal profile" ref="profile">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
              <h4 className="modal-title">Availability profile</h4>
            </div>
            <div className="modal-body">
              <p>Configure an availability profile {this.state.profile.role === 'group' ? 'as team member' : 'as individual'}.</p>

              {(this.state.profile.role === 'group') ? this.renderTeam() : null}

              <h5>Busy</h5>
              <p>
                Which calendars do you want to take into account to determine when you are busy&#63;&nbsp;
                {
                  this.renderPopover('Busy', 'You will be considered busy during all events found in the selected calendars.', 'left')
                }
              </p>
              <Selectize
                  value={this.state.profile.busy || ''}
                  options={this.getCalendarOptions()}
                  multiple="true"
                  placeholder="Select a calendar..."
                  onChange={this.handleBusyChange}
                  disabled={this.state.saving}
              />

              <h5>Available</h5>
              <p>
                Which calendar do you want to use to determine when you are available&#63;&nbsp;
                {
                    this.renderPopover('Available', 'All events in the selected calendar having the specified tag as title will be used to determine when you are availability (typically your working hours).', 'left')
                }
              </p>
              <div className="card">
                <table className="available">
                  <tbody>
                    <tr>
                      <th>Calendar</th>
                      <td>
                        <Selectize
                            value={this.state.profile.available || ''}
                            options={this.getCalendarOptions({filterPrimary: true})}
                            placeholder="Select a calendar..."
                            onChange={this.handleAvailableChange}
                            disabled={this.state.saving}
                            className="form-control"
                        />
                      </td>
                      <td>
                        <button
                            className="btn btn-normal"
                            title="Open a wizard to create a new calendar with availability events"
                            onClick={this.handleNewCalendar}
                        ><span className="glyphicon glyphicon-plus"></span> Create</button>
                      </td>
                    </tr>
                    <tr>
                      <th>
                        Tag {
                          this.renderPopover('Tag', 'All events in the selected calendar having the specified tag as title will be used to determine when you are availability (typically your working hours).', 'top')
                        }
                      </th>
                      <td>
                        <input
                            type="text"
                            className="form-control"
                            title="Availability tag"
                            value={this.state.profile.tag || ''}
                            placeholder="Enter a tag like '#available'"
                            onChange={this.handleTagChange}
                            disabled={this.state.saving}
                        />
                      </td>
                      <td>
                      </td>
                    </tr>
                    <tr>
                      <th>
                        Events {
                          this.renderPopover('Availability events', 'Availability events are events with a specific tag (like #available) as title. They are used to determine your availability, typically your working hours.', 'top')
                        }
                      </th>
                      <td>
                        <button
                            className="btn btn-normal"
                            title="Open a wizard to generate availability events"
                            onClick={this.showEventGenerator}
                            disabled={this.state.saving || !this.state.profile.available}
                        ><span className="glyphicon glyphicon-plus"></span> Generate</button>
                        &nbsp;
                        <button
                            className="btn btn-danger"
                            title="Delete all availability events"
                            onClick={this.deleteAvailabilityEvents}
                            disabled={this.state.saving || !this.state.profile.available}
                        ><span className="glyphicon glyphicon-remove"></span></button>
                      </td>
                      <td>
                      </td>
                    </tr>
                    <tr>
                      <th>Upcoming</th>
                      <td className="text">
                        <AvailabilityEventList calendar={this.state.profile.available} tag={this.state.profile.tag} />
                      </td>
                      <td>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="3" style={{fontStyle: 'italic'}}>You can edit your availability events straigtaway in <a href="https://www.google.com/calendar/" target="_blank">Google Calendar</a>.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              {
                this.state.saving ?
                    <span>saving <img className="loading" src="img/ajax-loader.gif" /></span> :
                    <span></span>
              } <button className="btn btn-default" onClick={this.cancel}>Cancel</button>
              <button className="btn btn-success" onClick={this.save} disabled={this.state.saving}>Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>;
  },

  renderTeam: function () {
    return <div>
      <h5>Team</h5>
      <p>
        Select an existing team or create a new team.
      </p>
      <Selectize
          value={this.state.profile.group || ''}
          options={this.getGroupOptions()}
          create={true}
          createOnBlur={true}
          placeholder="Select or create a team..."
          onChange={this.handleGroupChange}
          disabled={this.state.saving}
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

  /**
   * Render availability events of a profile
   * @param {Array} events
   */
  renderEvents: function (events) {
    if (events && events.length > 0) {
      var rows = events.map(function (event) {
        return <tr key={event.id}>
          <td>{moment(event.start.dateTime).format('ddd')}</td>
          <td>{formatTime(event.start.dateTime)} &ndash; {formatTime(event.end.dateTime)}</td>
        </tr>;
      });

      return <table className="days">
        <tbody>
        {rows}
          <tr><td>...</td><td></td></tr>
        </tbody>
      </table>;
    }
    else {
      return <span className="warning"><span className="glyphicon glyphicon-warning-sign"></span> no availability events found</span>;
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
    var elem = this.refs.profile.getDOMNode();

    if (!this._modal) {
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
  },

  handleGroupChange: function (value) {
    var profile = _.extend({}, this.state.profile, {
      group: value,
      role: 'group'
    });
    this.setState({profile: profile});
  },

  handleBusyChange: function (value) {
    var profile = _.extend({}, this.state.profile, {busy: value});
    this.setState({profile: profile});
  },

  handleAvailableChange: function (value) {
    var profile = _.extend({}, this.state.profile, {available: value});
    this.setState({profile: profile});
  },

  handleTagChange: function (event) {
    var profile = _.extend({}, this.state.profile, {tag: event.target.value});
    this.setState({profile: profile});
  },

  handleNewCalendar: function () {
    this.showEventGenerator({
      createCalendar: true,
      newCalendar: 'Available'
    });
  },

  showEventGenerator: function (options) {
    var generator = this.refs.generator;

    var _options = _.extend({}, {
      createCalendar: false,
      existingCalendar: this.state.profile.available,

      save: function (props) {
        generator.hide();

        var profile = _.extend({}, this.state.profile, {
          available: props.calendar,
          tag: props.tag
        });

        var updatedState = {
          profile: profile,
          visible: true
        };

        var isNew = !this.state.calendarList.some(function (calendar) {
          return calendar.id === props.calendar;
        });
        if (isNew) {
          var calendarList = this.state.calendarList.slice(0);
          calendarList.push({
            id: props.calendar,
            summary: props.name || props.calendar
          });
          updatedState.calendarList = calendarList;
        }

        this.setState(updatedState);
      }.bind(this),

      cancel: function () {
        this.setState({visible: true});
      }.bind(this)

    }, options);

    this.setState({visible: false});
    generator.show(_options);
  },

  // TODO: there is duplicate code in EventGenerator.jsx and SettingsPage.jsx
  /**
   * get calendar options for a select box
   * @param {{filterPrimary: boolean}} [options]
   * @returns {Array.<{value: string, text:string}>}
   */
  getCalendarOptions: function (options) {
    var calendarList = this.state.calendarList.concat([]);

    // add calendarId's from the currently selected profile
    if (this.state.busy) {
      splitIt(this.state.busy).forEach(function (calendarId) {
        if (!this.calendarExists(calendarId)) {
          calendarList.push({id: calendarId});
        }
      }.bind(this));
    }
    if (this.state.available && !this.calendarExists(calendarId)) {
      calendarList.push({id: this.state.available});
    }

    // generate calendar options
    return calendarList
        // filter calendars owned by the user,
        // Optionally, filter the users primary calendar
        .filter(function (calendar) {
          return calendar.accessRole === 'owner' && (!options || !options.filterPrimary || !calendar.primary);
        }.bind(this))

        .map(function (calendar) {
          var text = calendar.summary || calendar.id;
          if (text.length > 30) {
            text = text.substring(0, 30) + '...';
          }
          return {
            value: calendar.id,
            text: text
          }
        });
  },

  getGroupOptions: function () {
    return this.state.groupsList.map(function (entry) {
      return {
        value: entry.name,
        text: entry.name
      }
    }.bind(this));
  },

  calendarExists: function (calendarId) {
    return this.state.calendarList.some(function (calendar) {
      return calendar.id == calendarId ;
    });
  },

  // load the list with calendars
  loadCalendarList: function () {
    ajax.get('/calendar/')
        .then(function (calendarList) {
          console.log('Profile, loaded calendarList', calendarList);
          this.setState({calendarList: calendarList.items || []});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  // load all existing, aggregated groups
  loadGroupsList: function () {
    ajax.get('/groups')
        .then(function (groupsList) {
          console.log('groupsList', groupsList);
          this.setState({groupsList: groupsList});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  deleteAvailabilityEvents: function () {
    // TODO: implement deletion of availability events
    alert('Sorry, not yet implemented...')
  },

  show: function (options) {
    this.loadCalendarList();
    this.loadGroupsList();

    this.setState({
      // data
      profile:    options.profile,
      groups:     options.groups || [],

      // callbacks
      save:   options.save,
      cancel: options.cancel,

      // state
      saving: false,
      visible: true
    });
  },

  hide: function () {
    this.setState({
      visible: false
    });
  },

  saving: function (saving) {
    this.setState({
      saving: saving
    });
  },

  getProfile: function () {
    // return a copy of the state
    var profile = _.extend({}, this.state.profile);

    if (profile.role != 'group') {
      profile.group = null;
    }

    return profile;
  },

  save: function () {
    if (this.state.profile.role == 'group' && !this.state.profile.group) {
      alert('Error: select a team first');
      return;
    }

    if (typeof this.state.save === 'function') {
      this.state.save(this.getProfile());
    }
    else {
      throw new Error('save callback missing');
    }
  },

  cancel: function () {
    this.hide();

    if (typeof this.state.cancel === 'function') {
      this.state.cancel();
    }
  }
});