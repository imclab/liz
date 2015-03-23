/**
 * Usage:
 *
 * <Menu
 *    user={{name: string, email: string, loggedIn: boolean}}
 *    page={string}
 *    onPage={function}
 * />
 *
 * Where:
 * - `user` is a user object with name, email, and loggedIn properties
 * - `page` is the name of the active page. Available values: 'home',
 *   'calendar', 'settings'.
 * - `onPage` is a callback function called when the user clicks a page in
 *   the menu. The function is called with the clicked page as argument.
 */
var Menu = React.createClass({
  render: function() {
    var isCalendar = this.props.page == 'calendar' ? 'active' : null;
    var isSettings = this.props.page == 'settings' ? 'active' : null;
    var isHome = (isCalendar == null && isSettings == null) ? 'active' : null;
    // <img src={user.picture} className="user-icon"></img>

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
            <li className={isHome}><a href="#" onClick={this.goHome}>Home</a></li>
            <li className={isCalendar}><a href="#" onClick={this.goCalendar}>Calendar</a></li>
            <li className={isSettings}><a href="#" onClick={this.goSettings}>Settings</a></li>
          </ul>
          {this.renderLogin()}
        </div>
      </div>
    </nav>;
  },

  renderLogin: function () {
    var signoutUrl = '/auth/signout?redirectTo=' + encodeURIComponent(location.href);
    var signinUrl = '/auth/signin?redirectTo=' + encodeURIComponent(location.href);

    var user = this.props.user;
    if (!user) {
      // TODO: non clickable loading message          <p class="navbar-text navbar-right">loading...</p>
      return <ul className="nav navbar-nav navbar-right">
        <li>
          <a>loading...</a>
        </li>
      </ul>;
    }
    else if (user.loggedIn) {
      var title = 'Signed in as ' + user.name + ' (' + user.email + ')';
      return <ul className="nav navbar-nav navbar-right">
          <li className="dropdown">
            <a href="#" className="dropdown-toggle" data-toggle="dropdown">
              <span title={title}>{user.name}</span> <span className="caret"></span>
            </a>
            <ul className="dropdown-menu" role="menu">
              <li><a href={signoutUrl}>Sign out</a></li>
            </ul>
          </li>
        </ul>
    }
    else {
      return <ul className="nav navbar-nav navbar-right">
        <li>
          <a href={signinUrl}>Sign in</a>
        </li>
      </ul>;
    }
  },

  _setPage: function (page) {
    if (typeof this.props.onPage === 'function') {
      this.props.onPage(page);
    }
  },

  // TODO: this is a little bit stupid repeating code
  goHome: function (event) {
    this._setPage('home');

    event.stopPropagation();
    event.preventDefault();
  },

  goCalendar: function (event) {
    this._setPage('calendar');

    event.stopPropagation();
    event.preventDefault();
  },

  goSettings: function (event) {
    this._setPage('settings');

    event.stopPropagation();
    event.preventDefault();
  }
});
