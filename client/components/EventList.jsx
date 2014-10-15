/** @jsx React.DOM */

// TODO: group events per day
var EventList = React.createClass({
  render: function() {
    var data = this.props.events || [];
    var items = data.map(function (item) {
      return (<Event data={item} key={item.id}/>)
    });
    return (<div>{items}</div>)
  }
});
