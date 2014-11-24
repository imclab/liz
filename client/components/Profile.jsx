/**
 * Create a modal to edit a profile
 *
 * Create:
 *
 *   <Profile
 *      ref="profile"
 *      roles={Array}
 *      calendars={Array}
 *      onChange={function}
 *   />
 *
 * Where:
 *
 *   - `roles` is an Array<{text: string, value: string}> with the available roles
 *   - `calendars` is an Array<{text: string, value: string}> with the available calendars
 *   - `onChange` is a function, called when the profile is changed, with
 *     the profile as first argument.
 *
 * Use:
 *
 *   profile.show({role: ..., calendars: ..., tag: ...});
 *
 */
var Profile = React.createClass({
  getInitialState: function () {
    return {
      profile: this.props.profile || {
        role: '',
        calendars: '',
        tag: ''
      },
      showGenerator: false
    };
  },

  render: function () {
    return <div className="modal" ref="profile">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
            <h4 className="modal-title">Availability profile</h4>
          </div>
          <div className="modal-body">
            <p>Configure an availability profile.</p>
            <h5>Role</h5>
            <p>
            In which role do you want to be available&#63; You can create new roles.&nbsp;
            {
              this.renderPopover('Role', 'Role can be either your own email address, or the name of a team like "Consultant".')
            }

            </p>
            <Selectize
                value={this.state.profile.role || ''}
                options={this.props.roles}
                create={true}
                createOnBlur={true}
                placeholder="Select a role..."
                onChange={this.handleRoleChange}
            />

            <h5>Calendars</h5>
            <p>
              Which calendars do you want to take into account to determine your availability&#63;&nbsp;
              {
                this.renderPopover('Calendars', 'Select one or multiple calendars to determine your availability. These calendars will be used to determine (a) when you are busy, and (b) when you are availability by filtering tagged events.', 'left')
              }
            </p>
            <Selectize
                value={this.state.profile.calendars || ''}
                options={this.props.calendars}
                multiple="true"
                placeholder="Select a calendar..."
                onChange={this.handleCalendarsChange}
            />

            <h5>Tag</h5>
            <p>
            Which tag do you want to give the availability events&#63;&nbsp;
            {
              this.renderPopover('Tag', 'All events having the specified tag as title will be used to determine your availability (typically your working hours)')
            }
            </p>
            <input
                type="text"
                className="form-control"
                title="Availability tag"
                value={this.state.profile.tag || ''}
                placeholder="Enter a tag like '#available'"
                onChange={this.handleTagChange}
            />

            <h5>Generate availability events (optional)</h5>
            <p>Do you want to generate availability events in your calendar&#63;&nbsp;
            {
              this.renderPopover('Availability events', 'Via the generator, you can generate recurring events in your calendar on your working hours. The generated events have the specified tag "' + (this.state.profile.tag || '') + '" as event title and mark when you are available.')
            }
            </p>
            <p>
            <button
                className="btn btn-default"
                onClick={this.state.showGenerator ? this.hideGenerator : this.showGenerator}
            >{
              this.state.showGenerator ? 'Hide generator' : 'Show generator'
              }</button>
            </p>
            <div>
              {this.state.showGenerator ? this.renderGenerator() : ''}
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default" onClick={this.hide}>Cancel</button>
            <button type="button" className="btn btn-success" onClick={this.save}>Save</button>
          </div>
        </div>
      </div>
    </div>;
  },

  renderGenerator: function () {
    var selected = this.state.profile && this.state.profile.calendars &&
        this.state.profile.calendars.split(',');
    var calendars = this.props.calendars.filter(function (calendar) {
      return selected.indexOf(calendar.value) != -1;
    });

    return <div className="panel panel-primary">
      <div className="panel-heading">
        <h5 classNameclass="panel-title">Availability event generator</h5>
      </div>
      <div className="panel-body">
        <EventGenerator
            ref="generator"
            tag={this.state.profile.tag}
            calendars={calendars}
            onCreate={this.handleCreate}
        />
      </div>
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

    if (this.state.show) {
      $(elem).modal({
        keyboard: false, // prevent conflict with pressing ESC in dropdowns
        show: true
      });
    }
    else {
      $(elem).modal('hide');
    }
  },

  handleRoleChange: function (value) {
    var profile = _.extend({}, this.state.profile);
    profile.role = value;
    this.setState({profile: profile});
  },

  handleCalendarsChange: function (value) {
    var profile = _.extend({}, this.state.profile);
    profile.calendars = value;
    this.setState({profile: profile});
  },

  handleTagChange: function (event) {
    var profile = _.extend({}, this.state.profile);
    profile.tag = event.target.value;
    this.setState({profile: profile});
  },

  handleCreate: function (events) {
    // TODO: nicer looking alert
    alert('The availability events are successfully generated');

    this.hideGenerator();
  },

  show: function (profile) {
    this.setState({
      profile: profile,
      show: true,
      showGenerator: false
    });
  },

  showGenerator: function () {
    this.setState({showGenerator: true});
  },

  hideGenerator: function () {
    this.setState({showGenerator: false});
  },

  hide: function () {
    this.setState({
      show: false,
      showGenerator: false
    });
  },

  setProfile: function (profile) {
    this.setState({profile: profile});
  },

  getProfile: function () {
    // return a copy of the state
    return _.extend({}, this.state.profile);
  },

  save: function () {
    if (typeof this.props.onChange === 'function') {
      this.props.onChange(this.getProfile());
    }
    else {
      throw new Error('onChange handler missing');
    }

    this.hide();
  }
});