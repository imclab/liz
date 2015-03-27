var App = React.createClass({
  getInitialState: function () {
    this.loadUser();

    // listen for changes in the url hash "page"
    hash.onChange('page', function (page) {
      if (page != this.state.page && this.isMounted()) {
        this.setState({page: page});
      }
    }.bind(this));

    return {
      user: null,
      page: hash.get('page') || 'home'
    }
  },

  render: function () {
    var user = this.state.user;
    var menu = <Menu ref="menu" user={user} page={this.state.page} onPage={this.handlePageChange} />;

    var page;
    if (!user) {
      // loading
      page = <div>loading <img className="loading" src="img/ajax-loader.gif" /></div>;
    }
    else if (user && user.loggedIn) {
      // logged in
      switch(this.state.page) {
        case 'settings':  page = <SettingsPage ref="page" user={this.state.user} onChange={this.handleUserChange} />; break;
        case 'calendar':  page = <CalendarPage ref="page" user={this.state.user} />; break;
        default:          page = <HomePage ref="page" user={this.state.user} />; break;
      }
    }
    else if (user && !user.loggedIn) {
      // not logged in
      page = <div>
        <h1>Sign in to get started...</h1>
        <p><a href={'/auth/signin?redirectTo=' + encodeURIComponent(location.href)} className="btn btn-primary">Sign in</a>
        </p>
      </div>
    }

    var notifications;
    if (user && user.loggedIn) {
      notifications = <div>
        <SettingsValidator user={this.state.user} />
        <AccessRequests />
      </div>;
    }

    return <div>
        {menu}
        {notifications}
        {page}
    </div>;
  },

  handlePageChange: function (page) {
    hash.set('page', page);
    this.setState({page: page});
  },

  handleUserChange: function (user) {
    console.log('Changed user:', user);

    this.setState({user: user});

    ajax.put('/user/', user)
        .then(function (user) {
          console.log('user', user);
          this.setState({user: user});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        });
  },

  loadUser: function () {
    ajax.get('/user/')
        .then(function (user) {
          console.log('user', user);
          this.setState({user: user});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        });
  }
});
