// TODO: put all util functions in a namespace `util`

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

/**
 * Display an error message
 * @param {Error | string} error
 */
function displayError (error) {
  var msg = error && error.message || error.toString();

  var div = document.createElement('div');
  div.className = 'alert alert-danger alert-dismissible';
  div.role = 'alert';

  var button = document.createElement('button');
  button.type ='button';
  button.className = 'close';
  button['data-dismiss'] = 'alert';
  div.appendChild(button);

  var span1 = document.createElement('span');
  span1['aria-hidden'] = 'true';
  span1.innerHTML = '&times';
  button.appendChild(span1);

  var span2 = document.createElement('span');
  span2.className = 'sr-only';
  span2.innerHTML = 'Close';

  var strong = document.createElement('strong');
  strong.innerHTML = 'Error';
  div.appendChild(strong);

  div.appendChild(document.createTextNode(' ' + msg));

  var container = document.getElementById('errors');

  container.appendChild(div);

  button.onclick = function () {
    container.removeChild(div);
  }
}

/**
 * Find the first entry in an array for which given callback returns true,
 * return the index of this entry
 * @param {Array} array
 * @param {function(value: *, index: number, array: Array)} callback
 * @returns {number}
 */
function findIndex(array, callback) {
  for (var i = 0; i < array.length; i++) {
    if (callback(array[i], i, array)) {
      return i;
    }
  }
  return -1;
}
