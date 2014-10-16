/** @jsx React.DOM */

function init() {
  var app = React.renderComponent(<App/>, document.getElementById('app'));

  // change layout for different screen sizes
  window.onresize = function () {
    var width = document.body.clientWidth;

    var page = document.getElementById('page');
    page.className = (width < 500) ? 'small-screen' : 'normal';
  };
  window.onresize();
}

if (document.readyState === 'complete') {
  init();
}
else {
  window.onload = init;
}
