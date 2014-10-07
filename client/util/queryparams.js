/**
 * queryparams
 * This utility contains methods to manipulate the query parameters of the
 * web pages url
 *
 * Example usage:
 *
 *   queryparams.set('page', 'settings'); // add a query parameter
 *   queryparams.get('page');             // get a query parameter
 *   queryparams.getAll(); // get an object with all query parameters
 *   queryparams.setAll({id: 123, page: 'config'}); // replace all params
 */
var queryparams = {
  /**
   * get an object value with all parameters in the query params
   * @return {Object} query    object containing key/values
   */
  getAll: function () {
    var search = window.location.search.substring(1); // skip the ? character
    var params = search.split('&');
    var query = {};
    var key, value;

    for (var i = 0, iMax = params.length; i < iMax; i++) {
      var keyvalue = params[i].split('=');
      if (keyvalue.length == 2) {
        key = decodeURIComponent(keyvalue[0]);
        value = decodeURIComponent(keyvalue[1]);
      }
      else {
        key = decodeURIComponent(keyvalue);
        value = '';
      }
      if (key) {
        query[key] = value;
      }
    }
    return query;
  },

  /**
   * Set query parameters parameters
   * @param {Object} query    object with strings
   */
  setAll: function (query) {
    var search = '';

    for (var key in query) {
      if (query.hasOwnProperty(key)) {
        var value = query[key];
        if (key && value != undefined) {
          if (search.length) {
            search += '&';
          }
          search += encodeURIComponent(key);
          search += '=';
          search += encodeURIComponent(query[key]);
        }
      }
    }

    window.location.search = search;
  },

  /**
   * Retrieve a parameter value from the query params
   * @param {String} key
   * @return {String} value   undefined when the value is not found
   */
  get: function (key) {
    var query = queryparams.getAll();
    return query[key];
  },

  /**
   * Set an query parameter
   * @param {String} key
   * @param {String} value
   */
  set: function (key, value) {
    var query = queryparams.getAll();
    query[key] = value;
    queryparams.setAll(query);
  }
};
