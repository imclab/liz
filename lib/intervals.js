/**
 * Sort the intervals by start date
 * @param {Array.<string, Object>} intervals   A list with time intervals
 */
exports.sort = function (intervals) {
  intervals.sort(function (a, b) {
    return a.start > b.start;
  });
};

/**
 * Merge overlapping intervals in given list
 * @param {Array.<string, Object>} intervals
 * @return {Array.<string, Object>}  Returns an array with merged intervals
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
 * Create the inverse of a given set with intervals.
 * Provided intervals must be ordered, and may not have overlapping events
 * (to ensure all of this is ok, put the intervals through the method merge)
 * @param intervals
 * @param timeMin   Optional start time of the intervals. If the first
 *                   interval starts after timeMin, a gap from timeMin to
 *                   the first interval will be added to the inverse
 * @param timeMax   Optional end time of the intervals. If the last
 *                   interval ends before timeMax, a gap from the last
 *                   interval to timeMax will be added to the inverse
 * @return
 */
/* TODO
public static List<Interval> inverse(List<Interval> intervals,
    DateTime timeMin, DateTime timeMax) {
  List<Interval> inverse = new ArrayList<Interval>();

  // gap from timeMin to the first interval
  if (timeMin != null && intervals.size() > 0) {
    DateTime start = new DateTime(timeMin);
    DateTime end = intervals.get(0).getStart();
    if (start.isBefore(end)) {
      inverse.add(new Interval(start, end));
    }
  }

  // gaps between the intervals
  for (int i = 1, iMax = intervals.size(); i < iMax; i++) {
    DateTime start = intervals.get(i - 1).getEnd();
    DateTime end = intervals.get(i).getStart();

    if (end.isAfter(start)) {
      inverse.add(new Interval(start, end));
    }
  }

  // gap from last interval to timeMax
  if (timeMax != null && intervals.size() > 0) {
    DateTime start = new DateTime(intervals.get(intervals.size() - 1).getEnd());
    DateTime end = new DateTime(timeMax);
    if (start.isBefore(end)) {
      inverse.add(new Interval(start, end));
    }
  }

  // no intervals at all
  if (intervals.size() == 0) {
    DateTime start = new DateTime(timeMin);
    DateTime end = new DateTime(timeMax);
    inverse.add(new Interval(start, end));
  }

  return inverse;
}
*/

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