var HomePage = React.createClass({
  getInitialState: function () {
    return {
      timeslots: null,
      created: false
    };
  },

  render: function () {
    var user = this.props.user;

    return <div>
      <h1>Plan an event</h1>
      <EventScheduler user={user} />
    </div>;
  }
});
