/** @jsx React.DOM */

var HomePage = React.createClass({
  getInitialState: function () {
    return {};
  },

  componentWillUpdate: function (nextProps, nextState) {
    var email = nextState.user && nextState.user.email;
    if (email && !nextState.freeBusy) {
      nextState.freeBusy = [];
      this.loadFreeBusy(email);
    }
  },

  render: function () {
    var events = this.state.events;
    var busy = this.state.busy;
    return (
        <div>
        <h1>Busy</h1>
        <FreeBusyList busy={busy} />
        </div>
        );
  },

  loadFreeBusy: function (calendarId) {
    return ajax.get('/freeBusy/' + calendarId)
        .then(function (freeBusy) {
          console.log('freeBusy', freeBusy);
          this.setState({busy: freeBusy.busy || []});
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        })
  }
});

var FreeBusy = React.createClass({
  render: function() {
    var interval = this.props.data;

    return (<p>{interval.start} - {interval.end}</p>);
  }
});

var FreeBusyList = React.createClass({
  render: function() {
    var busy = this.props.busy || [];

    var items = busy.map(function (interval) {
      return (<FreeBusy data={interval} key={interval.start}/>)
    });

    return (<div>{items}</div>)
  }
});

