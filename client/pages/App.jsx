/** @jsx React.DOM */

var App = React.createClass({
  getInitialState: function () {
    this.loadUser();

    return {
      user: null,
      page: hash.get('page') || 'home'
    }
  },

  render: function () {
    var user = this.state.user;
    var menu = <Menu ref="menu" user={user} page={this.state.page} onPage={this.handlePageChange} />;

    var page;
    if (user && user.loggedIn == true) {
      switch(this.state.page) {
        case 'settings':  page = <SettingsPage ref="page" selection={this.state.user.calendars} onChange={this.handleSelection} />; break;
        case 'calendar':  page = <CalendarPage ref="page" user={this.state.user} />; break;
        default:          page = <HomePage ref="page" user={this.state.user} />; break;
      }
    }
    else if (user && user.loggedIn == false) {
      page = <div>
        <h1>Sign in to get started...</h1>
        <p><a href='/user/signin' className="btn btn-primary">Sign in</a>
        </p>
      </div>
    }
    else {
      // loading
      page = <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>;
    }

    return <div>
        {menu}
        {page}
    </div>;
  },

  handlePageChange: function (page) {
    hash.set('page', page);
    this.setState({page: page});
  },

  handleSelection: function (selection) {
    console.log('selected calendars:', selection);

    var user = this.state.user;
    user.calendars = selection;

    this.setState({user: user});

    ajax.put('/user/', {calendars: selection})
        .then(function (user) {
          console.log('user', user);
          // TODO: apply new user via setState? Propagate back to the main app?
          this.setState({user: user});
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        });
  },

  loadUser: function () {
    ajax.get('/user/')
        .then(function (user) {
          console.log('user', user);
          this.setState({user: user});
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        });
  }
});
