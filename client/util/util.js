/**
 * Format a moment.js date
 * @param {Moment} date
 * @returns {String}
 */
function formatDate(date) {
  return date.format('YYYY-MM-DD');
}

/**
 * Format a moment.js time
 * @param {Moment} date
 * @returns {String}
 */
function formatTime(date) {
  return date.format('HH:mm:ss')
      .replace(/(:00$)|(^00:00:00$)/, '');
}
