/**
 * A settings validator will check whether there is an availability profile
 * configured and if not, show a message asking whether to generate this.
 *
 * Usage:
 *
 *   <SettingsValidator user={Object} />
 *
 */
var SettingsValidator = React.createClass({
  getInitialState: function () {
    return {
      profiles: [],
      hasEvents: 'unknown' // True when the user has availability events 'unknown', false, or true
    }
  },

  componentDidMount: function () {
    this.refresh();
  },

  render: function () {
    var message;
    if (this.state.hasEvents === false) {
      message = <div className="notification">
        <div className="actions" style={{float: 'right', marginLeft: '10px'}}>
          <button
              title="Open a wizard to create an availability profile"
              className="btn btn-primary"
              onClick={this.showEventGenerator}
          >Create</button>
        </div>
        Welcome{this.props.user ? <b> {this.props.user.name}</b> : ''}, thanks for using Liz! Please create an availability profile describing your working hours.
        <EventGenerator ref="generator"/>
      </div>
    }

    return <div>{message}</div>;
  },

  refresh: function () {
    this.loadProfiles(function (err, profiles) {
      if (err) return;

      var profile = this.getIndividualProfile(profiles);

      this.hasAvailabilityEvents(profile, function (err, hasEvents) {
        this.setState({hasEvents: hasEvents});
      }.bind(this));
    }.bind(this));
  },

  // load the profiles of the user
  loadProfiles: function (callback) {
    ajax.get('/profiles')
        .then(function (profiles) {
          console.log('SettingsValidator profiles', profiles);
          this.setState({ profiles: profiles });

          callback && callback(null, profiles);
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);

          callback && callback(err);
        }.bind(this));
  },

  // test whether a profile has availability events
  hasAvailabilityEvents: function (profile, callback) {
    if (!profile || !profile.available || !profile.tag) {
      return callback(null, false);
    }

    console.log('Loading availability events. calendar: ' + profile.available + ' tag: ' + profile.tag);

    ajax.get('/calendar/' + profile.available)
        .then(function (result) {
          var hasEvents = (result.items || result.events).some(function (event) {
            return isAvailabilityEvent(event, profile.tag);
          });

          callback(null, hasEvents);
        })
        .catch(callback);
  },

  showEventGenerator: function () {
    var generator = this.refs.generator;
    if (!generator) {
      throw new Error('No EventGenerator configured');
    }

    generator.show({
      createCalendar: true,
      newCalendar: 'Availability',
      tag: '#available',

      save: function (props) {
        generator.hide();

        // create a new profile, or update the individual profile
        var profile = this.getIndividualProfile(this.state.profiles) || this.newProfile();
        profile.available = props.calendar;
        profile.tag = props.tag;

        this.saveProfile(profile, function (err, result) {
          if (!err) {
            this.refresh();
          }
        }.bind(this));
      }.bind(this)
    });
  },

  saveProfile: function (profile, callback) {
    ajax.put('/profiles', profile)
        .then(function (result) {
          callback && callback(null, result);
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
          callback && callback(err);
        }.bind(this));
  },

  newProfile: function () {
    return {
      _id: UUID(),
      busy: this.props.user.email
    }
  },

  getIndividualProfile: function (profiles) {
    return profiles.filter(function (profile) {
      return profile.role !== 'group';
    })[0];
  }
});
