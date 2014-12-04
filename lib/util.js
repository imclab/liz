var moment = require('moment');

/**
 * Format a date like 'Fri 17 Oct'
 * @param {Date | number | string | Moment} date
 * @returns {String}
 */
exports.formatHumanDate = function (date) {
  if (!date) return null;

  return moment(date).format('ddd DD MMM');
};

/**
 * Format a time like '15:30:12' or '15:30'
 * @param {Date | number | string | Moment} date
 * @returns {String}
 */
exports.formatTime = function (date) {
  if (!date) return null;

  return moment(date).format('HH:mm:ss')
      .replace(/(:00$)|(^00:00:00$)/, '');
};

// TODO: merge the client side util.js with the server side util.js