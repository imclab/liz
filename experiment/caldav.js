/**
 * CalDAV Experiment
 *
 * Test calendar interaction with an Exchange 2010 server via a MailDav gateway.
 *
 * MailDav setup:
 * - Install MailDav on your computer
 * - Start MailDav
 * - Configure MailDav:
 *   - Set the OWA (Exchange) URL to 'https://192.168.120.13/owa'
 *
 */

var fs = require('fs');
var inspect = require('util').inspect;
var request = require('request');
var parseXML = require('xml-parser');
var icalendar = require('icalendar');

var auth = {
  user: 'ALMENDE\\testuser1',
  pass: '@lm3nd3',
  sendImmediately: false
};

//// find all calendar entries
//request({
//      method: 'PROPFIND',
//      uri: 'http://localhost:1080/users/testuser1@almende.lan/calendar/',
//      headers: {'Depth': 1},
//      auth: auth,
//      body: read(__dirname + '/query/propfind_all.xml')
//    },
//    function (error, response, body) {
//      if (error) {
//        return console.error('Error: ', error);
//      }
//      console.log('Response status:', response.statusCode);
//      console.log('Response:');
//
//
//      var obj = parseXML(body);
//      console.log(inspect(obj, { colors: true, depth: Infinity }));
//    });


// report all calendar entries
request({
      method: 'REPORT',
      uri: 'http://localhost:1080/users/testuser1@almende.lan/calendar/',
      headers: {'Depth': 1},
      auth: auth,
      body: read(__dirname + '/query/report_expand.xml')
    },
    function (error, response, body) {
      if (error) {
        return console.error('Error: ', error);
      }
      var obj = parseXML(body);

      console.log('Response:');
      console.log('Response status:', response.statusCode);
      console.log(inspect(obj, { colors: true, depth: Infinity }));

      //obj.root.children.forEach(function (child) {
      //  var url = child.children[0].content;
      //  var data = child.children[1].children[0].children[0].content;
      //  var event = icalendar.parse_calendar(data);
      //
      //  console.log(inspect(event, { colors: true, depth: Infinity }));
      //
      //  console.log('url', url);
      //  console.log(event.components.VEVENT[0].properties.DTEND[0].value.toISOString() + ' - ' +
      //      event.components.VEVENT[0].properties.DTSTART[0].value.toISOString() + ' ' +
      //      event.components.VEVENT[0].properties.SUMMARY[0].value
      //  );
      //});
    });

/**
 * Read a file and return it as string
 * @param {string} path
 * @returns {string}
 */
function read(path) {
  return fs.readFileSync(path) + '';
}
