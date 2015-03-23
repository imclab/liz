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
              if (xhr.status == 0) {
                reject(new Error('Connection failed'));
              }
              else if (xhr.status < 400) { // 100, 200 and 300 range
                var contentType = xhr.getResponseHeader('content-type');
                if (contentType && contentType.toLowerCase().indexOf('application/json') == 0) {
                  resolve(JSON.parse(xhr.responseText), xhr.status, xhr);
                }
                else {
                  resolve(xhr.responseText, xhr.status, xhr);
                }
              }
              else {
                reject(new Error(xhr.responseText.replace(/Error: /, '')));
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

        if (typeof body === 'string') {
          xhr.send(body);
        }
        else {
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify(body));
        }
      }
      catch (err) {
        reject(err);
      }
    });
  }

  function get (url, headers) {
    return fetch('GET', url, '', headers);
  }

  function post (url, body, headers) {
    return fetch('POST', url, body, headers)
  }

  function put (url, body, headers) {
    return fetch('PUT', url, body, headers)
  }

  function del (url, headers) {
    return fetch('DELETE', url, '', headers)
  }

  return {
    'fetch': fetch,
    'get': get,
    'post': post,
    'put': put,
    'del': del
  }
})();
