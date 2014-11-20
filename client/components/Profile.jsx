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
 *      />
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
      role: '',
      calendars: '',
      tag: ''
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
            In which role do you want to be available&#63;&nbsp;
            {
              this.renderPopover('Role', 'Role can be either your own email address, or the name of a team like "Consultant". You can create new roles.')
            }

            </p>
            <Selectize
                value={this.state.role || ''}
                options={this.props.roles}
                create={true}
                createOnBlur={true}
                placeholder="Select a role..."
                onChange={this.handleRoleChange}
            />

            <h5>Calendars</h5>
            <p>
              Which calendars do you want to take into account for determining your availability&#63;&nbsp;
              {
                  this.renderPopover('Calendars', 'Select one or multiple calendars to be used to determine your availability: these calendars will be searched for availability events to determine when you are available, and regular events to determine when you are busy.')
              }
            </p>
            <Selectize
                value={this.state.calendars || ''}
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
                value={this.state.tag || ''}
                placeholder="Enter a tag like '#available'"
                onChange={this.handleTagChange}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-success" onClick={this.save}>Save</button>
          </div>
        </div>
      </div>
    </div>;
  },

  renderPopover: function (title, content) {
    return <a href="#" onClick={function (event) {event.preventDefault()}}>
      <span
          data-toggle="popover"
          data-placement="bottom"
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
  },

  componentDidUpdate: function () {
    // initialize all popovers
    $('[data-toggle="popover"]').popover();
  },

  handleRoleChange: function (value) {
    this.setState({role: value});
  },

  handleCalendarsChange: function (value) {
    this.setState({calendars: value});
  },

  handleTagChange: function (event) {
    this.setState({tag: event.target.value});
  },

  show: function (profile) {
    if (profile) {
      this.setProfile(profile);
    }

    var elem = this.refs.profile.getDOMNode();
    $(elem).modal('show');
  },

  hide: function () {
    var elem = this.refs.profile.getDOMNode();
    $(elem).modal('hide');
  },

  setProfile: function (profile) {
    this.setState(profile);
  },

  getProfile: function () {
    // return a copy of the state
    return _.extend({}, this.state);
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