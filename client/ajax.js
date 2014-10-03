/**
 * ajax
 * Utility to perform ajax get and post requests using a promise based interface
 */
var ajax = (function () {
  function fetch (method, url, body, headers, callback) {
    return new Promise(function (resolve, reject) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          try {
            if (xhr.readyState == 4) {
              var contentType = xhr.getResponseHeader('content-type');
              if (contentType && contentType.toLowerCase().indexOf('application/json') == 0) {
                resolve(JSON.parse(xhr.responseText), xhr.status, xhr);
              }
              else {
                resolve(xhr.responseText, xhr.status, xhr);
              }
            }
          }
          catch (err) {
            reject(err);
          }
        };
        xhr.open(method, url, true);
        if (headers) {
          for (var name in headers) {
            if (headers.hasOwnProperty(name)) {
              xhr.setRequestHeader(name, headers[name]);
            }
          }
        }
        xhr.send(body);
      }
      catch (err) {
        reject(err);
      }
    });
  }

  function get (url, headers) {
    return fetch('GET', url, null, headers);
  }

  function post (url, body, headers) {
    return fetch('POST', url, body, headers)
  }

  function put (url, body, headers) {
    return fetch('PUT', url, body, headers)
  }

  function del (url, headers) {
    return fetch('DELETE', url, null, headers)
  }

  return {
    'fetch': fetch,
    'get': get,
    'post': post,
    'put': put,
    'del': del
  }
})();
