/**
 * Create a modal to edit a profile
 *
 * Create:
 *
 *   <Profile
 *      ref="profile"
 *      groups={Array}
 *      calendars={Array}
 *      onChange={function}
 *   />
 *
 * Where:
 *
 *   - `groups` is an Array<{text: string, value: string}> with the available groups
 *   - `calendars` is an Array<{text: string, value: string}> with the available calendars
 *   - `onChange` is a function, called when the profile is changed, with
 *     the profile as first argument.
 *
 * Use:
 *
 *   profile.show({
 *     user: ...,
 *     calendars: ...,
 *     tag: ...,
 *     role: 'group' | 'individual',
 *     group: ...
 *   });
 *
 */
var Profile = React.createClass({
  getInitialState: function () {
    // TODO: replace loading all groups with smart auto completion, loading groups matching current search
    return {
      profile: this.props.profile || {
        user: '',
        calendars: '',
        tag: '',
        role: '',
        group: ''
      }
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

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default" onClick={this.hide}>Cancel</button>
            <button type="button" className="btn btn-success" onClick={this.save}>Save</button>
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
          options={this.props.groups}
          create={true}
          createOnBlur={true}
          placeholder="Select or create a team..."
          onChange={this.handleGroupChange}
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

    // prevent conflict with pressing ESC in dropdowns
    $(elem).modal({keyboard: false});

    // show/hide the modal
    $(elem).modal(this.state.show ? 'show' : 'hide');
  },

  handleRoleChange: function (value) {
    var profile = _.extend({}, this.state.profile);
    profile.role = value;
    this.setState({profile: profile});
  },

  handleGroupChange: function (value) {
    var profile = _.extend({}, this.state.profile);
    profile.group = value;
    profile.role = 'group';
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

  show: function (profile) {
    this.setState({
      profile: profile,
      show: true
    });
  },

  hide: function () {
    this.setState({
      show: false
    });
  },

  setProfile: function (profile) {
    this.setState({profile: profile});
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

    if (typeof this.props.onChange === 'function') {
      this.props.onChange(this.getProfile());
    }
    else {
      throw new Error('onChange handler missing');
    }

    this.hide();
  }
});