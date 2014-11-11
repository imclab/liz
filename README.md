liz
===

Dynamic planning tool

# Run

To start the server locally:

    node server.js --clientID CLIENT_ID --clientSecret CLIENT_SECRET

Note that CLIENT_ID and CLIENT_SECRET must be retrieved from the 
[Google Developers Console](https://console.developers.google.com/). You will have to:

- Create a project there.
- Enable the *Calendar API* and *Contacts API* on the page "APIs".
- Create a CLIENT ID for web application on the page "Credentials".
  Click button "Create new Client ID", select "Web application", 
  leave authorized JavaScript origins empty, Fill out an Authorized Redirect URI,
  for example "http://localhost:8082/auth/callback" when running the app locally.
- Optionally, fill in a product name, url, and logo on the page "Consent screen".

Then open the development web interface in your browser:
 
    http://localhost:8082/dev.html

To load the production web interface: 

    http://localhost:8082

The production interface uses bundled javascript and css file, generated when
running `gulp`.


# Deploy

First generate the bundled files `app.min.js` and `app.min.css` for the client 
side by executing the following command in the root of the project:

    npm run build

It is also possible to let gulp continuously watch for changes and automatically
rebuild when a file is changed by running `gulp watch`.

Deploy to Heroku:

    git push -u heroku master

The app is available at [http://smartplanner.herokuapp.com](http://smartplanner.herokuapp.com).

Set the following environment variables:

    heroku config:set GOOGLE_CLIENT_ID=<your client id>
    heroku config:set GOOGLE_CLIENT_SECRET=<your client secret>
    heroku config:set NODE_ENV=production

Alternatively, the variables can be set via the Heroku dashboard at the apps settings.

The Heroku app requires the following add-ons:

    heroku addons:add papertrail
    heroku addons:add mongohq


# Test

To the the code, run:

    npm test


# REST API


## Authentication

- `GET /auth`

  Authenticate the user. Will redirect to the OAuth 2 website of Google.
  After authentication, the page is redirected to `/auth/callback`.

- `GET /auth/callback`

  Redirect page after a user has authenticated itself. This page will
  redirect to the original page the user was at before logging in.

- `GET /auth/signin`

  Sign in, authenticate the user, redirects to `/auth`.

  Query parameters:
  - `redirectTo` An url to redirect to (typically the users current page)
    after authentication was successful. Default value is `/`.

- `GET /auth/signout`

  Sign out and destroy the users session.

  Query parameters:
  - `redirectTo` An url to redirect to (typically the users current page)
    after authentication was successful. Default value is `/`.


## User

- `GET /user`

  Get the profile of the current user. When logged in, an object with the
  following structure is returned:

  ```json
  {
    "loggedIn": true,
    "email": "email@example.com",
    "name": "User Name",
    "picture": "url_to_picture",
    "calendars": [
      "email@example.com"
    ],
    "share": "calendar"
  }
  ```

  When not logged in, the returned object looks like:

  ```json
  {
    "loggedIn": false
  }
  ```

- `PUT /user`

  Update a users profile. The request body must contain a JSON Object like:

  ```json
  {
      "name": "User Name",
      "picture": "url_to_picture",
      "calendars": [
        "email@example.com"
      ],
      "share": "calendar"
    }
  }
  ```
  Only provided properties are updated on the users profile, other properties
  are left unchanged. One can add new properties if needed.

- `DELETE /user`

  Delete the logged in user. This will completely remove the users account
  and revoke granted permissions.


## Calendar

- `GET /calendar`

  Returns an object with all the users Google Calendars. Returns the response
  of the Google Calendar `/calendarList` API:
  https://developers.google.com/google-apps/calendar/v3/reference/calendarList/list

- `GET /calendar/:calendarId`

  Retrieve calendar items. Returns an Object with calendar events as returned
  by the Google Calendar `/events` API:
  https://developers.google.com/google-apps/calendar/v3/reference/events/list

  By default, all events between now and seven days are retrieved.

  Query parameters:
  - `timeMin` ISO date string with the start of a time interval.
  - `timeMax` ISO date string with the end of a time interval.

- `PUT /calendar/:calendarId`

  Insert a new calendar event. The event must be a valid [Event resource](https://developers.google.com/google-apps/calendar/v3/reference/events#resource),
  as described here:
  https://developers.google.com/google-apps/calendar/v3/reference/events/insert

- `DELETE /calendar/:calendarId/:eventId`

  Delete a calendar event.


## FreeBusy

- `GET /freeBusy/:calendarId?`

  Get the free busy interval of a specific calendarId. If no `calendarId` is
  provided, the email of the logged in user is used as calendar id.

  By default, all intervals between now and seven days are retrieved.

  Query parameters:
  - `timeMin: string` ISO date string with the start of a time interval.
  - `timeMax: string` ISO date string with the end of a time interval.

  Returns:

  ```js
  {
    "free": [
      {
        "start": ISO_DATE_STRING,
        "end": ISO_DATE_STRING
      }
    ],
    "busy": [
      {
        "start": ISO_DATE_STRING,
        "end": ISO_DATE_STRING
      }
    ],
    "errors": [
      {
        "id": CALENDAR_ID,
        "message": STRING"
      }
    ]
  }
  ```


## Contacts

- `GET /contacts/:email?`

  Get all contacts of a user. If parameter `email` is not provided, the contacts
  of the logged in user are returned.

  Query parameters:
  - `raw: boolean` If true, the "raw" Google Contacts as returned by Googles
    API are returned as JSON. If false (default), a simple list with contacts
    having `name` and `email` is returned.

  If `raw == false` (default), returns:

  ```json
  [
    {
      "name": "User Name",
      "email": "foo@company.com"
    }
  ]
  ```

  If `raw == true`, an object with Google Contacts is returns (JSON format),
  as described here: https://developers.google.com/google-apps/contacts/v3/


## Groups

- `GET /groups/list`

  Get a list with all groups. Returns an Array structured like:

  ```json
  [
    {
      "id": "group:Developer",
      "name": "Developer",
      "count": 2,
      "members": [
          "foo@company.com",
          "bar@company.com"
      ]
    }
  ]
  ```

- `GET /groups`

  Get all groups of the current users. Returns an Array with group names like:

  ```json
  [
    "Developer"
  ]
  ```

- `PUT /groups`

  Replace all groups of current user. Request body must contain an Array with
  group names:

  ```json
  [
    "Developer"
  ]
  ```
