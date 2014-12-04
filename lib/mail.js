var nodemailer = require('nodemailer');
var config = require('../config');
var util = require('../lib/util');

// create an SMTP transporter if noreply email is configured
var transporter = null;
if (config.NOREPLY_EMAIL != undefined && config.NOREPLY_PASSWORD != undefined) {
  transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: config.NOREPLY_EMAIL,
      pass: config.NOREPLY_PASSWORD
    }
  });

  console.log('Created SMTP transporter for email ' + config.NOREPLY_EMAIL);
}

/**
 * Send an email confirmation for a created event
 * @param {Object} event   A google calendar event
 */
exports.confirmPlannedEvent = function (event) {
  var mailOptions = buildMessage(event, 'planned');

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(err, info){
    if (err) {
      console.log(err);
    }
    else {
      // we could log the results...
    }
  });
};

/**
 * Send an email confirmation for an updated event
 * @param {Object} event   A google calendar event
 */
exports.confirmUpdatedEvent = function (event) {
  var mailOptions = buildMessage(event, 'updated');

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(err, info){
    if (err) {
      console.log(err);
    }
    else {
      // we could log the results...
    }
  });
};

/**
 * Send an email confirmation for a canceled event
 * @param {Object} event   A google calendar event
 */
exports.confirmCanceledEvent = function (event) {
  var mailOptions = buildMessage(event, 'canceled');

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(err, info){
    if (err) {
      console.log(err);
    }
    else {
      // we could log the results...
    }
  });
};

/**
 * Build a confirmation message
 * @param {Object} event    A google calendar event
 * @param {string} action   Select 'planned' (default), 'updated' or 'canceled'
 * @returns {{from: string, to: string, subject: string, text: string, html: string}} mailOptions
 */
function buildMessage (event, action) {
  var to = event.attendees.map(function (attendee) {
    return attendee.email;
  }).join(', ');

  var time = util.formatHumanDate(event.start.dateTime) + ' ' +
      util.formatTime(event.start.dateTime) + ' - ' +
      util.formatTime(event.end.dateTime);
  var description = removeFooter(event.description || '');

  var subject;
  switch (action) {
    case 'planned':  subject = 'Confirmation: ' + event.summary + ' @ ' + time; break;
    case 'updated':  subject = 'Updated: ' + event.summary + ' @ ' + time; break;
    case 'canceled': subject = 'Canceled: ' + event.summary + ' @ ' + time; break;
    default:
      throw new Error('Unknown action "' + action + '"');
  }

  var updateUrl = (config.SERVER_URL) + '#update=' + event.id;
  var cancelUrl = (config.SERVER_URL) + '#cancel=' + event.id;

  var text = [
    'The following event is ' + (action || 'planned') + ':',
    '',
    'Title: ' + event.summary || '',
    'Attendees: ' + to,
    'Time: ' + time,
    'Location: ' + event.location || '',
    'Description: ' + description,
    '',
    'This event is created using Liz.',
    'Update the event: ' + updateUrl,
    'Cancel the event: ' + cancelUrl
  ].join('\n');

  var html = [
    '<p>' +
    '  The following event is ' + (action || 'planned') + ':' +
    '</p>',
    '<table>',
    '<tbody>',
    '  <tr><th style="text-align: left;">Title</th><td>', event.summary + '</td></tr>',
    '  <tr><th style="text-align: left;">Attendees</th><td>', to + '</td></tr>',
    '  <tr><th style="text-align: left;">Time</th><td>', time + '</td></tr>',
    '  <tr><th style="text-align: left;">Location</th><td>', (event.location || '') + '</td></tr>',
    '  <tr><th style="text-align: left;">Description</th><td>', description + '</td></tr>',
    '  </tbody>',
    '  </table>',
    '<p>' +
    '  This event is created using Liz. ',
    '  <a href="', updateUrl + '">Update</a> or ',
    '  <a href="', cancelUrl + '">cancel</a> this event.',
    '</p>'
  ].join('\n');

  return {
    from: config.NOREPLY_EMAIL,
    to: to,
    subject: subject,
    text: text,
    html: html
  };
}

function removeFooter(description) {
  var index = description.indexOf('This event is created by Liz');
  return description.substring(0, index);
}

exports.sendMail = transporter.sendMail.bind(transporter);
