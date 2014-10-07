/** @jsx React.DOM */

var user = null;
var calendars = null;

var menu = React.renderComponent(
    <Menu/>,
    document.getElementById('menu')
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

function loadCalendars() {
  return ajax.get('/calendar/')
      .then(function (calendars) {
        console.log('calendars', calendars);
        var calendarList = React.renderComponent(
            <CalendarList calendars={calendars.items} />,
            document.getElementById('calendars')
        );
      })
}

function loadEvents(calendarId) {
  return ajax.get('/calendar/' + calendarId)
      .then(function (events) {
        console.log('events', events);
        var eventList = React.renderComponent(
            <EventList events={events.items} />,
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
    .then(function (loadedUser) {
      user = loadedUser;
      console.log('user', user);
      menu.setState({user: user});

      if (user.loggedIn) {
        var calendarId = user.email;
        return Promise.all([
          loadCalendars(user.calendars)
          //loadEvents(calendarId),
          //loadFreeBusy(calendarId)
          ]);
      }
    })
    .catch(function (err) {
      console.log('Error', err);
    });
