/**
 * Display notifications of access requests, like:
 *
 *   User jos@almende.org requests access to the team Consultant [Accept] [Deny]
 *
 * Usage:
 *
 *   <AccessRequests />
 *
 */
var AccessRequests = React.createClass({
  REFRESH_INTERVAL: 60 * 1000, // refresh once a minute

  getInitialState: function () {
    return {
      requests: []
    }
  },

  timer: null,

  componentDidMount: function () {
    this.loadRequests();

    this.timer = setInterval(this.loadRequests.bind(this), this.REFRESH_INTERVAL);
  },

  componentWillUnmount: function () {
    clearInterval(this.timer);
  },

  render: function () {
    var requests = this.state.requests.map(function (profile, index) {
      return <div key={index} className="notification">
        User <b>{profile.user}</b> requests access to the team <b>{profile.group}</b> <div
            className='actions'>
          <button
              className="btn btn-primary"
              onClick={function () {
                this.grantAccess({
                  user: profile.user,
                  group: profile.group,
                  access: 'granted'
                });
              }.bind(this)}
          >Accept</button>&nbsp;
          <button
              className="btn btn-danger"
              onClick={function () {
                this.grantAccess({
                  user: profile.user,
                  group: profile.group,
                  access: 'denied'
                });
              }.bind(this)}
          >Deny</button>
        </div>
      </div>;
    }.bind(this));

    return <div>{requests}</div>;
  },

  // load all pending requests for access to a team
  loadRequests: function () {
    ajax.get('/profiles/pending')
        .then(function (requests) {
          console.log('access requests', requests);
          this.setState({requests: requests});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  // grant a user access to a team
  grantAccess: function (profile) {
    ajax.post('/profiles/grant', profile)
        .then(function (result) {
          console.log('result', result);
          this.loadRequests();
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
          this.loadRequests();
        }.bind(this));
  }
});
