/**
 * A settings validator will check whether there is an availability profile
 * configured and if not, show a message asking whether to generate this.
 *
 * Usage:
 *
 *   <SettingsValidator />
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
    this.loadProfiles(function (err, profiles) {
      if (err) return;

      var profile = profiles.filter(function (profile) {
        return profile.role !== 'group';
      })[0];

      if (profile) {
        this.hasAvailabilityEvents(profile, function (err, hasEvents) {
          this.setState({hasEvents: hasEvents});
        }.bind(this));
      }
    }.bind(this));
  },

  render: function () {
    var message;
    if (this.state.hasEvents === false) {
      message = <div className="notification">
        No availability events configured
      </div>
    }

    return <div>{message}</div>;
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
    console.log('Loading availability events. calendar: ' + profile.available + ' tag: ' + profile.tag);

    if (!profile.available || !profile.tag) {
      return callback(null, false);
    }

    ajax.get('/calendar/' + profile.available)
        .then(function (result) {
          var hasEvents = (result.items || result.events).some(function (event) {
            return isAvailabilityEvent(event, profile.tag);
          });

          callback(null, hasEvents);
        })
        .catch(callback);
  }
});