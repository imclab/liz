/**
 * Interval utils
 *
 * Sort, merge, invert intervals. An interval is defined as an object:
 *
 *     {
 *       start: Date, number, string,
 *       end: Date, number, string
 *     }
 *
 * Where `start` and `end` can be:
 * - a Date like new Date()
 * - a number with unix timestamp like 1413183600000
 * - a string containing an ISO date like '2014-10-13T07:00:00Z'
 */

(function (exports) {

  /**
   * Sort the intervals by start date
   * @param {Array.<Object>} intervals   A list with time intervals
   */
  exports.sort = function (intervals) {
    intervals.sort(function (a, b) {
      return a.start > b.start ? 1 :
          a.start < b.start ? -1 :
          0;
    });
    return intervals;
  };

  /**
   * Merge overlapping intervals in given list
   * @param {Array.<Object>} intervals
   * @return {Array.<Object>}  Returns an array with merged intervals
   */
  exports.merge = function (intervals) {
    // copy the intervals
    var merged = intervals.slice(0);

    // order the intervals
    exports.sort(merged);

    // merge the intervals
    var i = 1;  // important to start at 1 (this is not accidentally)
    while (i < merged.length) {
      var prev = merged[i - 1];
      var cur = merged[i];

      if (cur.start <= prev.end) {
        // merge these two intervals
        var combined = {
          start: prev.start,
          end: (cur.end > prev.end) ? cur.end : prev.end
        };

        // replace the old two with the new one
        merged.splice(i - 1, 2, combined);
      }
      else {
        i++;
      }
    }

    // return merged intervals
    return merged;
  };

  /**
   * Create the inverse of a given list with intervals: returns the gaps between
   * the intervals. Can be used to turn a list with busy intervals into a list
   * with free intervals for example.
   *
   * Provided intervals must be ordered, and may not have overlapping events
   * (to ensure all of this is ok, apply the method merge to the intervals first)
   *
   * @param {Array.<Object>} intervals
   * @param [timeMin]  Optional start time of the intervals. If the first
   *                   interval starts after timeMin, a gap from timeMin to
   *                   the first interval will be added to the inverse
   * @param [timeMax]  Optional end time of the intervals. If the last
   *                   interval ends before timeMax, a gap from the last
   *                   interval to timeMax will be added to the inverse
   * @return
   */
  exports.invert = function(intervals, timeMin, timeMax) {
    var inverse = [];

    // gap from timeMin to the first interval
    if (timeMin != undefined && intervals.length > 0) {
      var firstStart = intervals[0].start;
      if (timeMin < firstStart) {
        inverse.push({
          start: timeMin,
          end: firstStart
        });
      }
    }

    // gaps between the intervals
    for (var i = 1; i < intervals.length; i++) {
      var interval = {
        start: intervals[i - 1].end,
        end: intervals[i].start
      };

      if (interval.start < interval.end) {
        inverse.push(interval);
      }
      else {
        if (interval.start > interval.end) {
          throw new Error('Overlapping intervals. Please sort and merge the intervals first.');
        }
      }
    }

    // gap from last interval to timeMax
    if (timeMax != undefined && intervals.length > 0) {
      var lastEnd = intervals[intervals.length - 1].end;
      if (timeMax > lastEnd) {
        inverse.push({
          start: lastEnd,
          end: timeMax
        });
      }
    }

    // no intervals at all
    if (timeMin != undefined && timeMax != undefined && intervals.length == 0) {
      inverse.push({
        start: timeMin,
        end: timeMax
      });
    }

    return inverse;
  };


  /**
   * Generate timeslots
   * @param {Array.<Object>} free   A list with free intervals
   * @param {number} duration       Duration in milliseconds
   */
  exports.generateTimeslots = function(free, duration) {
    var timeslots = [];
    var now = moment();

    if (duration > 0) {
      free.forEach(function (interval) {
        var iStart = moment(interval.start);
        var iEnd = moment(interval.end);
        var start = iStart.clone();
        if (start.minutes() > 0) { // change to zero minutes
          start.minutes(0);
          start.add(1, 'hour');
        }
        if (start.hour() % 2 == 0) { // hour is an even number
          start.add(1, 'hour');
        }
        var end = start.clone().add(duration, 'milliseconds');

        var HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
        var step = 2 * HOUR;

        while (end.valueOf() <= iEnd.valueOf()) {
          if (start > now) {
            timeslots.push({
              start: start.toISOString(),
              end: end.toISOString()
            });
          }

          start = start.add(step, 'milliseconds');
          end = start.clone().add(duration, 'milliseconds');
        }
      });
    }

    return timeslots;
  };

})((function () {
  return (typeof exports !== 'undefined') ? exports : (window['intervals'] = {});
})());