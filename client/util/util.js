/**
 * Format a moment.js date
 * @param {Date | number | string | Moment} date
 * @returns {String}
 */
function formatDate(date) {
  return moment(date).format('YYYY-MM-DD');
}

/**
 * Format a moment.js time
 * @param {Date | number | string | Moment} date
 * @returns {String}
 */
function formatTime(date) {
  return moment(date).format('HH:mm:ss')
      .replace(/(:00$)|(^00:00:00$)/, '');
}

/**
 * Generate timeslots
 * @param {Array.<Object>} free   A list with free intervals
 * @param {number} duration       Duration in milliseconds
 */
// TODO: move this to shared/intervals.js
function generateTimeslots(free, duration) {
  var timeslots = [];

  if (duration > 0) {
    free.forEach(function (interval) {
      var start = moment(interval.start);
      var end = start.clone().add(duration, 'milliseconds');
      var maxEnd = moment(interval.end);

      while (end.valueOf() < maxEnd.valueOf()) {
        // TODO: replace this with an availability profile
        if (start.day() == end.day() &&
            start.day() != 0 && start.day() != 6 &&    // no Sunday and Saturday
            start.format('HH:mm:ss') >= '09:00:00' && end.format('HH:mm:ss') <= '17:00:00') {
          timeslots.push({
            start: start.toISOString(),
            end: end.toISOString()
          });
        }

        start = end.clone();
        end = start.clone().add(duration, 'milliseconds');
      }
    });
  }

  return timeslots;
}