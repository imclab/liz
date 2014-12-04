var argv = require('yargs').argv;

// environment
exports.PRODUCTION = (process.env.NODE_ENV == 'production');

// express
exports.PORT = argv.PORT || process.env.PORT || 8082;

// server url (used for creating links in calendar items to update or cancel an event)
exports.SERVER_URL = argv.SERVER_URL || process.env.SERVER_URL || 'https://smartplanner.herokuapp.com';

// email and password for sending confirmation emails
exports.NOREPLY_EMAIL    = argv.NOREPLY_EMAIL    || process.env.NOREPLY_EMAIL;
exports.NOREPLY_PASSWORD = argv.NOREPLY_PASSWORD || process.env.NOREPLY_PASSWORD;

if (!exports.NOREPLY_EMAIL) {
  console.warn('WARNING: No NOREPLY_EMAIL configured. Provide a NOREPLY_EMAIL via command line arguments or an environment variable');
}
if (!exports.NOREPLY_PASSWORD) {
  console.warn('WARNING: No NOREPLY_PASSWORD configured. Provide a NOREPLY_PASSWORD via command line arguments or an environment variable');
}

// mongo
exports.MONGO_URL = argv.MONGO_URL ||
    process.env.MONGO_URL ||
    process.env.MONGOHQ_URL ||
    'mongodb://127.0.0.1:27017';
exports.MONGO_DB = 'smartplanner';

// google authentication
exports.GOOGLE_CLIENT_ID = argv.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
exports.GOOGLE_CLIENT_SECRET = argv.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
exports.CALLBACK_URL = exports.PRODUCTION ?
    'https://smartplanner.herokuapp.com/auth/callback' :
    'http://localhost:' + exports.PORT + '/auth/callback';

if (!exports.GOOGLE_CLIENT_ID) {
  throw new Error('No GOOGLE_CLIENT_ID configured. Provide a GOOGLE_CLIENT_ID via command line arguments or an environment variable');
}
if (!exports.GOOGLE_CLIENT_SECRET) {
  throw new Error('No GOOGLE_CLIENT_SECRET configured. Provide a GOOGLE_CLIENT_SECRET via command line arguments or an environment variable');
}

console.log('MONGO_URL (or MONGOHQ_URL):', exports.MONGO_URL);
console.log('Authentication callback url:', exports.CALLBACK_URL);
