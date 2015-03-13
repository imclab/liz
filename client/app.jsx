function init() {
  // change layout for different screen sizes
  window.onresize = function () {
    var width = document.body.clientWidth;

    var body = document.getElementsByTagName("body")[0];
    body.className = (width < 700) ? 'small-screen' : 'normal';
  };
  window.onresize();

  var app = React.render(<App/>, document.getElementById('app'));
}

if (document.readyState === 'complete') {
  init();
}
else {
  window.onload = init;
}
