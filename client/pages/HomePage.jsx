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
      <EventScheduler user={user} />
    </div>;
  }
});
