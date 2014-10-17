/**
 * Format a date like '2014-10-17'
 * @param {Date | number | string | Moment} date
 * @returns {String}
 */
function formatDate(date) {
  if (!date) return null;

  return moment(date).format('YYYY-MM-DD');
}
/**
 * Format a date like 'Fri 17 Oct'
 * @param {Date | number | string | Moment} date
 * @returns {String}
 */
function formatHumanDate(date) {
  if (!date) return null;

  return moment(date).format('ddd DD MMM');
}

/**
 * Format a time like '15:30:12' or '15:30'
 * @param {Date | number | string | Moment} date
 * @returns {String}
 */
function formatTime(date) {
  if (!date) return null;

  return moment(date).format('HH:mm:ss')
      .replace(/(:00$)|(^00:00:00$)/, '');
}
