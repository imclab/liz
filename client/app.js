/** @jsx React.DOM */

var login = React.renderComponent(
    <UserMenu/>,
    document.getElementById('login')
);

/**
 * Get the current user
 * @returns {Promise.<Object, Error>}
 *   Returns a promise which resolves with a user object:
 *   {loggedIn: boolean, name: string, email: string}
 */
function getUser() {
  return ajax.get('/user/');
}

function getEvents(calendarId) {
  return ajax.get('/calendar/' + calendarId);
}

function getFreeBusy() {
  return ajax.get('/freeBusy/')
}

getUser()
    .then(function (user) {
      login.setState({user: user});

      return getEvents(user.email);
    })
    .then(function (events) {
      console.log('events', events);

      var eventList = React.renderComponent(
          <EventList data={events.items} />,
          document.getElementById('events')
      );

      return getFreeBusy();
    })
    .then(function (freeBusy) {
      console.log('freeBusy', freeBusy);
    })
    .catch(function (err) {
      console.log('Error', err);
    });