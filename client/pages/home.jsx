/** @jsx React.DOM */

var HomePage = React.createClass({
  getInitialState: function () {
    return {
      user: null,
      timeslots: null,
      created: false
    };
  },

  render: function () {
    var user = this.state.user;

    if (user && user.loggedIn == true) {
      // logged in
      return (
          <div>
            <h1>Plan an event</h1>
            <EventScheduler user={user} />
          </div>
          );
    }
    else if (user && user.loggedIn == false) {
      // not logged in
      return (
          <div>
            <h1>Plan an event</h1>
            <p><a href='/user/signin' className="btn btn-primary">Sign in</a>
            </p>
          </div>
          );
    }
    else {
      // loading
      return (
          <div>
            loading...
          </div>
          );
    }
  }
});
