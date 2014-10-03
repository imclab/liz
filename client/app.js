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

function loadEvents(calendarId) {
  return ajax.get('/calendar/' + calendarId)
      .then(function (events) {
        console.log('events', events);
        var eventList = React.renderComponent(
            <EventList data={events.items} />,
            document.getElementById('events')
        );
      })
}

function loadFreeBusy(calendarId) {
  return ajax.get('/freeBusy/' + calendarId)
      .then(function (freeBusy) {
        console.log('freeBusy', freeBusy);
        var freeBusyList = React.renderComponent(
            <FreeBusyList calendars={freeBusy.calendars} />,
            document.getElementById('freeBusy')
        );
      })
}

getUser()
    .then(function (user) {
      login.setState({user: user});

      if (user.loggedIn) {
        var calendarId = user.email;
        return Promise.all([loadEvents(calendarId), loadFreeBusy(calendarId)]);
      }
    })
    .catch(function (err) {
      console.log('Error', err);
    });