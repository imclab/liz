/** @jsx React.DOM */

var menu = null;
var page = null;
var user = null;

var pageId = queryparams.get('page') || 'home';
var container = document.getElementById('contents');

menu = React.renderComponent(<Menu/>, document.getElementById('menu'));

switch(pageId) {
  case 'settings':
    page = React.renderComponent(<SettingsPage/>, container);
    break;

  default: // home
    page = React.renderComponent(<HomePage/>, container);
    break;
}

ajax.get('/user/')
    .then(function (loadedUser) {
      user = loadedUser;
      console.log('user', user);

      menu.setState({user: user});
      page.setState({user: user});
    })
    .catch(function (err) {
      console.log('Error', err);
    });
