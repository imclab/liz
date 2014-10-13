// test IndexNode
var assert = require('assert');
var moment = require('moment');
var intervals = require('../lib/intervals');

describe('intervals', function() {
  var busyString;
  var busyNumber;
  var busyDate;

  beforeEach(function () {
    busyString = [
      {start: '2014-10-15T07:00:00Z', end: '2014-10-15T16:00:00Z'},
      {start: '2014-10-13T16:00:00Z', end: '2014-10-13T17:30:00Z'},
      {start: '2014-10-14T14:00:00Z', end: '2014-10-14T15:30:00Z'},
      {start: '2014-10-13T07:00:00Z', end: '2014-10-13T16:00:00Z'},
      {start: '2014-10-15T14:00:00Z', end: '2014-10-15T17:00:00Z'},
      {start: '2014-10-15T17:00:00Z', end: '2014-10-15T19:00:00Z'}
    ];

    busyNumber = busyString.map(function (interval) {
      return {
        start: moment(interval.start).valueOf(),
        end: moment(interval.end).valueOf()
      }
    });

    busyDate = busyString.map(function (interval) {
      return {
        start: moment(interval.start).toDate(),
        end: moment(interval.end).toDate()
      }
    })

  });

  describe('sort', function () {

    it('should sort intervals (iso strings)', function () {
      intervals.sort(busyString);

      assert.deepEqual(busyString, [
        {start: '2014-10-13T07:00:00Z', end: '2014-10-13T16:00:00Z'},
        {start: '2014-10-13T16:00:00Z', end: '2014-10-13T17:30:00Z'},
        {start: '2014-10-14T14:00:00Z', end: '2014-10-14T15:30:00Z'},
        {start: '2014-10-15T07:00:00Z', end: '2014-10-15T16:00:00Z'},
        {start: '2014-10-15T14:00:00Z', end: '2014-10-15T17:00:00Z'},
        {start: '2014-10-15T17:00:00Z', end: '2014-10-15T19:00:00Z'}
      ]);
    });

    it('should sort intervals (number)', function () {
      intervals.sort(busyNumber);

      assert.deepEqual(busyNumber, [
        {start: new Date('2014-10-13T07:00:00Z').valueOf(), end: new Date('2014-10-13T16:00:00Z').valueOf()},
        {start: new Date('2014-10-13T16:00:00Z').valueOf(), end: new Date('2014-10-13T17:30:00Z').valueOf()},
        {start: new Date('2014-10-14T14:00:00Z').valueOf(), end: new Date('2014-10-14T15:30:00Z').valueOf()},
        {start: new Date('2014-10-15T07:00:00Z').valueOf(), end: new Date('2014-10-15T16:00:00Z').valueOf()},
        {start: new Date('2014-10-15T14:00:00Z').valueOf(), end: new Date('2014-10-15T17:00:00Z').valueOf()},
        {start: new Date('2014-10-15T17:00:00Z').valueOf(), end: new Date('2014-10-15T19:00:00Z').valueOf()}
      ]);
    });

    it('should sort intervals (Date)', function () {
      intervals.sort(busyDate);

      assert.deepEqual(busyDate, [
        {start: new Date('2014-10-13T07:00:00Z'), end: new Date('2014-10-13T16:00:00Z')},
        {start: new Date('2014-10-13T16:00:00Z'), end: new Date('2014-10-13T17:30:00Z')},
        {start: new Date('2014-10-14T14:00:00Z'), end: new Date('2014-10-14T15:30:00Z')},
        {start: new Date('2014-10-15T07:00:00Z'), end: new Date('2014-10-15T16:00:00Z')},
        {start: new Date('2014-10-15T14:00:00Z'), end: new Date('2014-10-15T17:00:00Z')},
        {start: new Date('2014-10-15T17:00:00Z'), end: new Date('2014-10-15T19:00:00Z')}
      ]);
    });

  });

  describe('merge', function () {

    it('should merge intervals', function () {
      var merged = intervals.merge(busyString);

      assert.deepEqual(merged, [
        {start: '2014-10-13T07:00:00Z', end: '2014-10-13T17:30:00Z'},
        {start: '2014-10-14T14:00:00Z', end: '2014-10-14T15:30:00Z'},
        {start: '2014-10-15T07:00:00Z', end: '2014-10-15T19:00:00Z'}
      ]);
    });

  });

  describe('inverse', function () {

    it('should inverse intervals (ISO strings)', function () {
      var inverse = intervals.inverse([
        {start: '2014-10-13T07:00:00Z', end: '2014-10-13T14:00:00Z'},
        {start: '2014-10-13T16:00:00Z', end: '2014-10-13T18:30:00Z'},
        {start: '2014-10-13T20:00:00Z', end: '2014-10-13T23:00:00Z'}
      ]);

      assert.deepEqual(inverse, [
        {start: '2014-10-13T14:00:00Z', end: '2014-10-13T16:00:00Z'},
        {start: '2014-10-13T18:30:00Z', end: '2014-10-13T20:00:00Z'}
      ]);
    });

    it('should inverse intervals (numbers)', function () {
      var inverse = intervals.inverse([
        {start: new Date('2014-10-13T07:00:00Z').valueOf(), end: new Date('2014-10-13T14:00:00Z').valueOf()},
        {start: new Date('2014-10-13T16:00:00Z').valueOf(), end: new Date('2014-10-13T18:30:00Z').valueOf()},
        {start: new Date('2014-10-13T20:00:00Z').valueOf(), end: new Date('2014-10-13T23:00:00Z').valueOf()}
      ]);

      assert.deepEqual(inverse, [
        {start: new Date('2014-10-13T14:00:00Z').valueOf(), end: new Date('2014-10-13T16:00:00Z').valueOf()},
        {start: new Date('2014-10-13T18:30:00Z').valueOf(), end: new Date('2014-10-13T20:00:00Z').valueOf()}
      ]);
    });

    it('should inverse intervals (Date)', function () {
      var inverse = intervals.inverse([
        {start: new Date('2014-10-13T07:00:00Z'), end: new Date('2014-10-13T14:00:00Z')},
        {start: new Date('2014-10-13T16:00:00Z'), end: new Date('2014-10-13T18:30:00Z')},
        {start: new Date('2014-10-13T20:00:00Z'), end: new Date('2014-10-13T23:00:00Z')}
      ]);

      assert.deepEqual(inverse, [
        {start: new Date('2014-10-13T14:00:00Z'), end: new Date('2014-10-13T16:00:00Z')},
        {start: new Date('2014-10-13T18:30:00Z'), end: new Date('2014-10-13T20:00:00Z')}
      ]);
    });

    it('should inverse intervals with a timeMin and timeMax given', function () {
      var inverse = intervals.inverse([
        {start: '2014-10-13T07:00:00Z', end: '2014-10-13T14:00:00Z'},
        {start: '2014-10-13T16:00:00Z', end: '2014-10-13T18:30:00Z'},
        {start: '2014-10-13T20:00:00Z', end: '2014-10-13T23:00:00Z'}
      ], '2014-10-13T04:00:00Z', '2014-10-13T23:50:00Z');

      assert.deepEqual(inverse, [
        {start: '2014-10-13T04:00:00Z', end: '2014-10-13T07:00:00Z'},
        {start: '2014-10-13T14:00:00Z', end: '2014-10-13T16:00:00Z'},
        {start: '2014-10-13T18:30:00Z', end: '2014-10-13T20:00:00Z'},
        {start: '2014-10-13T23:00:00Z', end: '2014-10-13T23:50:00Z'}
      ]);
    });

    it('should inverse empty intervals with a timeMin and timeMax given', function () {
      var inverse = intervals.inverse([], '2014-10-13T07:00:00Z', '2014-10-13T14:00:00Z');

      assert.deepEqual(inverse, [
        {start: '2014-10-13T07:00:00Z', end: '2014-10-13T14:00:00Z'}
      ]);
    });

    it('should inverse empty intervals', function () {
      var inverse = intervals.inverse([]);

      assert.deepEqual(inverse, []);
    });

  });

});
