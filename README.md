liz
===

Dynamic planning application

# Run

To start the server locally:

    node server.js [options]

The following options are available:

Name                   | Required | Description
---------------------- | -------- | -------------------------------------------------------
GOOGLE_CLIENT_ID<br>GOOGLE_CLIENT_SECRET | Yes | The google cliend id and secret for the application, required for oauth2. See section "Google client id and secret".
NOREPLY_EMAIL<br>NOREPLY_PASSWORD | No | The credentials of a gmail account. If provided, this account is used to send confirmation emails on behalv of Liz.
NODE_ENV             | No | Can be "production" (default) or "development".
PORT                 | No | Port number for the server, 8082 by default.
SERVER_URL           | No | Public url of the server, by default https://smartplanner.herokuapp.com when in production and http://localhost:PORT when in development environment.
MONGO_URL            | No | Url of the mongo database. Defaults to mongodb://127.0.0.1:27017
MONGOHQ_URL          | No | Alias of `--MONGO_URL`
MONGO_DB             | No | Name of the Mongo collection to be used by Liz, "smartplanner" by default.

Example: 

    node server.js --GOOGLE_CLIENT_ID <your client id> --GOOGLE_CLIENT_SECRET <your client secret>

Then open the development web interface in your browser:
 
    http://localhost:8082/dev.html

To load the production web interface: 

    http://localhost:8082

The production interface uses bundled javascript and css file, generated when
running `gulp`.


# Google client id and secret

Configuration of GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET is required, this is needed for authorization using oauth2. 
They have to be retrieved from the[Google Developers Console](https://console.developers.google.com/). You will have to:

- Create a project there.
- Enable the *Calendar API* and *Contacts API* on the page "APIs".
- Create a CLIENT ID for web application on the page "Credentials".
  Click button "Create new Client ID", select "Web application", 
  leave authorized JavaScript origins empty, Fill out an Authorized Redirect URI,
  for example "http://localhost:8082/auth/callback" when running the app locally.
- Optionally, fill in a product name, url, and logo on the page "Consent screen".


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
    heroku config:set NOREPLY_EMAIL=<your google email>
    heroku config:set NOREPLY_PASSWORD=<your google email password>
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

-   `GET /auth`

    Authenticate the user. Will redirect to the OAuth 2 website of Google.
    After authentication, the page is redirected to `/auth/callback`.

-   `GET /auth/callback`

    Redirect page after a user has authenticated itself. This page will
    redirect to the original page the user was at before logging in.

- `GET /auth/signin`

    Sign in, authenticate the user, redirects to `/auth`.

    Query parameters:
    -   `redirectTo` An url to redirect to (typically the users current page)
        after authentication was successful. Default value is `/`.

-   `GET /auth/signout`

    Sign out and destroy the users session.

    Query parameters:
    -   `redirectTo` An url to redirect to (typically the users current page)
        after authentication was successful. Default value is `/`.


## User

-   `GET /user`

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

-   `PUT /user`

    Update a users profile. The request body must contain a JSON Object like:

    ```json
    {
        "name": "User Name",
        "picture": "url_to_picture",
        "share": "calendar"
      }
    }
    ```

    Only provided properties are updated on the users profile, other properties
    are left unchanged. One can add new properties if needed.

-   `DELETE /user`

    Delete the logged in user. This will completely remove the users account
    and revoke granted permissions.


## Calendar

-   `GET /calendar`

    Returns an object with all the users Google Calendars. Returns the response
    of the Google Calendar `/calendarList` API:
    https://developers.google.com/google-apps/calendar/v3/reference/calendarList/list

-   `GET /calendar/:calendarId`

    Retrieve calendar items. Returns an Object with calendar events as returned
    by the Google Calendar `/events` API:
    https://developers.google.com/google-apps/calendar/v3/reference/events/list

    By default, all events between now and fourteen days are retrieved.

    Query parameters:
    -   `timeMin` ISO date string with the start of a time interval.
    -   `timeMax` ISO date string with the end of a time interval.

-   `POST /calendar/:calendarId`

    Insert a new calendar event. The event must be a valid [Event resource](https://developers.google.com/google-apps/calendar/v3/reference/events#resource),
    as described here:
    https://developers.google.com/google-apps/calendar/v3/reference/events/insert

-   `PUT /calendar/:calendarId/:eventId`

    Update an existing calendar event. The event must be a valid [Event resource](https://developers.google.com/google-apps/calendar/v3/reference/events#resource),
    as described here:
    https://developers.google.com/google-apps/calendar/v3/reference/events/insert.
    The `id` in the event resource must match the `:eventId` parameter in the url.

-   `DELETE /calendar/:calendarId/:eventId`

    Delete a calendar event.


## FreeBusy

-   `GET /freeBusy/:calendarId?`

    Get the free busy interval of a specific calendarId. If no `calendarId` is
    provided, the email of the logged in user is used as calendar id.

    By default, all intervals between now and fourteen days are retrieved.

    Query parameters:
    -   `timeMin: string` ISO date string with the start of a time interval.
    -   `timeMax: string` ISO date string with the end of a time interval.
    -   `group: string`   A group like "Consultant". If not provided,
        the users email address is used as role.

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

-   `GET /contacts/:email?`

    Get all contacts of a user. If parameter `email` is not provided, the contacts
    of the logged in user are returned.

    Query parameters:
    - `raw: boolean` If true, the "raw" Google Contacts as returned by Googles
      API are returned as JSON. If false (default), a simple list with contacts
      having `name` and `email` is returned.

    If `raw == false` (default), returns:

    ```js
    [
      {
        "name": "User Name",
        "email": "foo@company.com"
      }
    ]
    ```

    If `raw == true`, an object with Google Contacts is returns (JSON format),
    as described here: https://developers.google.com/google-apps/contacts/v3/


## Profiles, Groups

-   `GET /groups`

    Get a list with all groups (aggregated result from all profiles).
    Returns an Array structured like:

    ```js
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

    Query parameters:
    -   `member: string` Filter groups containing the specified member.
        Must be the email address of a member.

-   `GET /profiles`

    Get all profiles of the current users. Returns an Array with profiles like:

    ```js
    [
      {
        "_id": "6a409334-72a5-4304-98ac-26318348cb18",
        "user": "jos@almende.org",
        "calendars": "calendarIdA, calendarIdB",
        "tag": "#consultancy",
        "role": "group" | "individual",
        "group": "Consultant" | null,
        "access": "pending" | "granted" | "denied"
      }
    ]
    ```

-   `PUT /profiles`

    Create or update the profile of current user. Request body must contain a
    profile like:

    ```js
    {
      "_id": "6a409334-72a5-4304-98ac-26318348cb18",
      "user": "jos@almende.org",
      "calendars": "calendarIdA, calendarIdB",
      "tag": "#consultancy",
      "role": "group" | "individual",
      "group": "Consultant" | null
    }
    ```

-   `DELETE /profiles/:id`

    Delete a profile by its id.


-   `GET /profiles/pending`

    Get a list with profiles with pending access requests. The returned list
    contains all pending profiles having groups of which the logged in user is
    a member.

    Returns an Array like:

    ```js
    [
      {
        "_id": "6a409334-72a5-4304-98ac-26318348cb18",
        "user": "jos@almende.org",
        "calendars": "calendarIdA, calendarIdB",
        "tag": "#consultancy",
        "role": "group" | "individual",
        "group": "Consultant" | null,
        "access": "pending" | "granted" | "denied"
      }
    ]
    ```

-   `POST /profiles/grant`

    Grant access for a new user to an existing group. Request body must contain
    a JSON object like:

    ```js
    {
      "user": "jos@almende.org",
      "group": "Consultant",
      "access": "granted" | "denied"
    }
    ```

    The response will be "ok" when successful.


-   `POST /profiles/generate`

    Generate availability events. Expects a request body with a JSON object like:

    ```js
    {
      "tag": STRING           // for example '#availability'
      "calendar": CALENDAR_ID,
      "createCalendar": NEW_CALENDAR_NAME,
      "zone": TIME_ZONE       // for example -60 or '-01:00' or '+08:00'
      "days": [
        {
          "day": WEEK_DAY,    // "Monday", "Tuesday", ...
          "start": TIME,      // "09:00"
          "end": TIME         // "17:00"
        }
      ]
    }
    ```

    Either the field `calendar` must be provided with the id of an existing
    calendar, *or* the field `createCalendar` must be provided with the name
    of a new calendar. In the last case, a new calendar will be created.

