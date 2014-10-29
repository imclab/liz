//var Menu = React.createClass({
//  render: function() {
//    var user = this.state && this.state.user;
//    if (!user) {
//      return (<div>loading...</div>)
//    }
//    else if (user.loggedIn) {
//      return (<div><img src={user.picture} className="user-icon"></img> {user.name} ({user.email}) <a href="/user/logout">logout</a></div>);
//    }
//    else {
//      return (<div><a href="/user/login">login</a></div>);
//    }
//  }
//});

var Menu = React.createClass({
  getInitialState: function () {
    return {
      user: this.props.user || null,
      page: this.props.page || 'home'
    }
  },

  render: function() {
    var isCalendar = this.state.page == 'calendar' ? 'active' : null;
    var isSettings = this.state.page == 'settings' ? 'active' : null;
    var isHome = (isCalendar == null && isSettings == null) ? 'active' : null;
    // <img src={user.picture} className="user-icon"></img>

    var _setPage = function (page) {
      this.setState({page: page});

      if (typeof this.props.onPage === 'function') {
        this.props.onPage(page);
      }
    }.bind(this);

    // TODO: this is a little bit stupid repeating code
    var goHome     = function () {_setPage('home'); return false;};
    var goCalendar = function () {_setPage('calendar'); return false;};
    var goSettings = function () {_setPage('settings'); return false;};

    var login;
    var user = this.props.user;
    if (!user) {
      // TODO: non clickable loading message          <p class="navbar-text navbar-right">loading...</p>
      login = <ul className="nav navbar-nav navbar-right">
        <li>
          <a>loading...</a>
        </li>
      </ul>;
    }
    else if (user.loggedIn) {
      var title = 'Signed in as ' + user.name + ' (' + user.email + ')';
      login = (
          <ul className="nav navbar-nav navbar-right">
            <li className="dropdown">
              <a href="#" className="dropdown-toggle" data-toggle="dropdown"><span title={title}>{user.name}</span> <span className="caret"></span>
              </a>
              <ul className="dropdown-menu" role="menu">
                <li><a href="#" onClick={goSettings}>Settings</a></li>
                <li className="divider"></li>
                <li><a href={'/user/signout?redirectTo=' + encodeURIComponent(location.href)}>Sign out</a></li>
              </ul>
            </li>
          </ul>
          );
    }
    else {
      login = <ul className="nav navbar-nav navbar-right">
        <li>
          <a href={'/user/signin?redirectTo=' + encodeURIComponent(location.href)}>Sign in</a>
        </li>
      </ul>;
    }

    return <nav className="navbar navbar-default" role="navigation">
      <div className="container-fluid">
        <div className="navbar-header">
          <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">
            <span className="sr-only">Toggle navigation</span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
          </button>
        </div>

        <div className="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
          <ul className="nav navbar-nav">
            <li className={isHome}><a href="#" onClick={goHome}>Home</a></li>
            <li className={isCalendar}><a href="#" onClick={goCalendar}>Calendar</a></li>
          </ul>
              {login}
        </div>
      </div>
    </nav>;
  }
});
