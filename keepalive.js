#!/bin/node

// little script to ping the heroku app once every 30 minutes
// to prevent it from going in sleep mode. Yeah, we want a fast demo you know.

var http = require('http');

function getIndex() {
  var url = 'http://smartplanner.herokuapp.com/index.html';

  http.get(url, function(res) {
    var body = '';
    console.log(new Date().toISOString() + ' Status: ' + res.statusCode);
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      console.log(new Date().toISOString() + ' Bytes: ' + body.length);
    });
  }).on('error', function(err) {
    console.log(new Date().toISOString() + ' Error: ' + err);
  });
}

var HOUR = 1000 * 60 * 60; // ms

setInterval(getIndex, 0.5 * HOUR);
getIndex();
