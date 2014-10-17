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
      return a.start > b.start;
    });
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
          // TODO: replace this with an availability profile
          if (start.day() == end.day() &&
              start.day() != 0 && start.day() != 6 &&    // no Sunday and Saturday
              start.format('HH:mm:ss') >= '09:00:00' && end.format('HH:mm:ss') <= '17:00:00') {
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

  /**
   * check if interval to be checked overlaps with any any of the intervals
   * in given list
   * @param intervals
   * @param checkInterval
   * @return isOverlapping
   */
  /* TODO
  public static boolean overlaps(Interval checkInterval,
      List<Interval> intervals) {
    for (Interval interval : intervals) {
      if (interval.overlaps(checkInterval)) {
        return true;
      }
    }
    return false;
  }
  */


  /**
   * Create a busy profile with office hours. The method returns the
   * the available hours, inside office hours.
   * By default, the office hours are from Monday-Friday, 09:00-17:00, with
   * time zone CET.
   * @param timeMin
   * @param timeMax
   * @return available
   */
  /* TODO
  public static List<Interval> getOfficeHours(DateTime timeMin, DateTime timeMax) {
    Set<Integer> workingDays = new HashSet<Integer>();  // 1=Monday, 7=Sunday
    workingDays.add(1); // Monday
    workingDays.add(2); // Tuesday
    workingDays.add(3); // Wednesday
    workingDays.add(4); // Thursday
    workingDays.add(5); // Friday

    int hourStart = 9;
    int hourEnd = 17;
    DateTimeZone timeZone = DateTimeZone.forID("CET"); // Central European Time

    return getOfficeHours(timeMin, timeMax, workingDays, hourStart,
        hourEnd, timeZone);
  }
  */

  /**
   * Create a busy profile with office hours. The method returns the
   * the available hours, inside office hours.
   * @param timeMin
   * @param timeMax
   * @param workingDays   Set with working days. 1 = Monday, 7 = Sunday
   * @param hourStart     start hour, for example 9
   * @param hourStart     end hour, for example 17
   * @param timeZone      the timezone to be used to determine the working hours
   * @return available
   */
  /* TODO
  public static List<Interval> getOfficeHours(
      DateTime timeMin, DateTime timeMax,
      Set<Integer> workingDays,
      int hourStart, int hourEnd, DateTimeZone timeZone) {
    List<Interval> available = new ArrayList<Interval>();

    MutableDateTime workingDayMin = MutableDateTime.now(); // 09:00:00
    workingDayMin.setZoneRetainFields(timeZone);
    workingDayMin.setMillisOfDay(0);
    workingDayMin.setHourOfDay(hourStart);
    MutableDateTime workingDayMax = MutableDateTime.now();   // 17:00:000
    workingDayMax.setZoneRetainFields(timeZone);
    workingDayMax.setMillisOfDay(0);
    workingDayMax.setHourOfDay(hourEnd);

    MutableDateTime time = new MutableDateTime(timeMin);
    while (time.isBefore(timeMax)) {
      // find the first working day inside the interval
      while (!workingDays.contains(time.getDayOfWeek())) {
        time.addDays(1);
      }

      // set working hours to today
      workingDayMin.setDate(time);
      workingDayMax.setDate(time);

      // set time to the start of the day
      time.setMillisOfDay(0);

      // create the start of the working day
      DateTime start = null;
      if (workingDayMin.isAfter(timeMin)) {
        start = new DateTime(workingDayMin);
      }
      else {
        start = new DateTime(timeMin);
      }

      // create the end of the working day
      DateTime end = null;
      if (workingDayMax.isBefore(timeMax)) {
        end = new DateTime(workingDayMax);
      }
      else {
        end = new DateTime(timeMax);
      }

      // create interval if not empty
      if (start.isBefore(end)) {
        Interval hours = new Interval(start, end);
        available.add(hours);
      }

      // move to the next day
      time.addDays(1);
    }

    return available;
  }
  */

})((function () {
  return (typeof exports !== 'undefined') ? exports : (window['intervals'] = {});
})());