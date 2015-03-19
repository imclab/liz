/**
 * Create a modal to edit a profile
 *
 * Create:
 *
 *   <Profile ref="profile" generator={...} />
 *
 * Where:
 *
 *   - `generator` is a reference to an EventGenerator
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
 *     groups=[...],
 *     calendars=[...]
 *     save: function(profile: Object)
 *     cancel: function (optional)
 *   });
 *
 *   profile.hide();
 *
 * Where:
 *
 *   - `groups` is an Array<{text: string, value: string}> with the available groups
 *   - `calendars` is an Array<{text: string, value: string}> with the available calendars
 *
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

      groups: [],
      calendars: []
    };
  },

  render: function () {
    return <div className="modal profile" ref="profile">
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
                options={this.state.calendars}
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
                          options={this.getAvailableCalendars()}
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
                      ><span className="glyphicon glyphicon-plus"></span></button>
                    </td>
                  </tr>
                  <tr>
                    <th>Tag</th>
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
                    <th>Profile</th>
                    <td className="profile">
                        (no events found)
                    </td>
                    <td>
                      <button
                          className="btn btn-normal"
                          title="Open a wizard to generate availability events"
                          onClick={this.showEventGenerator}
                      ><span className="glyphicon glyphicon-plus"></span></button>
                      &nbsp;
                      <button
                          className="btn btn-danger"
                          title="Delete all availability events"
                          onClick={this.deleteAvailabilityEvents}
                      ><span className="glyphicon glyphicon-remove"></span></button>
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
          options={this.state.groups}
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
    var generator = this.props.generator;
    if (!generator) {
      throw new Error('No EventGenerator configured');
    }

    var _options = _.extend({}, {
      createCalendar: false,
      existingCalendar: this.state.profile.available,

      calendars: this.getAvailableCalendars(),

      save: function (props) {
        generator.hide();

        var profile = _.extend({}, this.state.profile, {
          available: props.calendar,
          tag: props.tag
        });

        this.setState({
          profile: profile,
          visible: true
        });
      }.bind(this),

      cancel: function () {
        this.setState({visible: true});
      }.bind(this)
    }, options);

    this.setState({visible: false});
    generator.show(_options);
  },

  /**
   * Return the list with calendars allowed a availability calendar,
   * filters out the users main calendar
   */
  getAvailableCalendars: function () {
    return this.state.calendars.filter(function (calendar) {
      return calendar.value !== this.state.profile.user;
    }.bind(this));
  },

  deleteAvailabilityEvents: function () {
    // TODO: implement deletion of availability events
    alert('Sorry, not yet implemented...')
  },

  show: function (options) {
    this.setState({
      // data
      profile:    options.profile,
      groups:     options.groups || [],
      calendars:  options.calendars || [],

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