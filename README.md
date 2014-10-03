liz
===

Dynamic planning tool

# Run

To start the server:

    node index.js --clientID CLIENT_ID --clientSecret CLIENT_SECRET

Note that CLIENT_ID and CLIENT_SECRET must be configured via the 
[Google Developers Console](https://console.developers.google.com/). You will have to:

- Create a project there.
- Enable the Calendar API on the page "APIs".
- Create a CLIENT ID for web application on the page "Credentials".
  Click button "Create new Client ID", select "Web application", 
  leave authorized JavaScript origins empty, Fill out an Authorized Redirect URI,
  for example "http://localhost:8082/auth/callback" when running the app locally.
- Optionally, fill in a product name, url, and logo on the page "Consent screen".

Then open the web interface in your browser:
 
    http://localhost:8082
