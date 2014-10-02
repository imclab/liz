/** @jsx React.DOM */

var UserMenu = React.createClass({
  render: function() {
    var user = this.state && this.state.user;
    if (!user) {
      return (<div>loading...</div>)
    }
    else if (user.loggedIn) {
      return (<div>{user.name} ({user.email}) <a href="/user/logout">logout</a></div>);
    }
    else {
      return (<div><a href="/user/login">login</a></div>);
    }
  }
});

var Event = React.createClass({
  render: function() {
    var item = this.props.data;
    return (
        <p>
          <b>{item.summary}</b><br/>
          {item.start.dateTime} - {item.end.dateTime}
        </p>
        );
  }
});

var EventList = React.createClass({
  render: function() {
    var data = this.props.data || [];
    var items = data.map(function (item) {
      return (<Event data={item} key={item.id}/>)
    });
    return (<div>{items}</div>)
  }
});
