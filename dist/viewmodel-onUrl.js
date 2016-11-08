'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLoadUrl = exports.getSaveUrl = undefined;

var _lzstring = require('./lzstring');

var _lzstring2 = _interopRequireDefault(_lzstring);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getSavedData, getUrl, _parseUri, updateQueryString;

if (typeof window !== 'undefined' && window.history) {
  (function (history) {
    var pushState, replaceState;
    pushState = history.pushState;
    replaceState = history.replaceState;
    if (pushState) {
      history.pushState = function (state, title, url) {
        if (typeof history.onstatechange === 'function') {
          history.onstatechange(state, title, url);
        }
        return pushState.apply(history, arguments);
      };
      history.replaceState = function (state, title, url) {
        if (typeof history.onstatechange === 'function') {
          history.onstatechange(state, title, url);
        }
        return replaceState.apply(history, arguments);
      };
    } else {
      history.pushState = function () {};
      history.replaceState = function () {};
    }
  })(window.history);
}

_parseUri = function parseUri(str) {
  var i, m, o, uri;
  o = _parseUri.options;
  m = o.parser[o.strictMode ? "strict" : "loose"].exec(str);
  uri = {};
  i = 14;
  while (i--) {
    uri[o.key[i]] = m[i] || "";
  }
  uri[o.q.name] = {};
  uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
    if ($1) {
      uri[o.q.name][$1] = $2;
    }
  });
  return uri;
};

_parseUri.options = {
  strictMode: false,
  key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
  q: {
    name: "queryKey",
    parser: /(?:^|&)([^&=]*)=?([^&]*)/g
  },
  parser: {
    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
  }
};

getUrl = function getUrl(target) {
  if (target == null) {
    target = document.URL;
  }
  return _parseUri(target);
};

updateQueryString = function updateQueryString(key, value, url) {
  var hash, re, separator;
  if (!url) {
    url = window.location.href;
  }
  re = new RegExp('([?&])' + key + '=.*?(&|#|$)(.*)', 'gi');
  hash = void 0;
  if (re.test(url)) {
    if (typeof value !== 'undefined' && value !== null) {
      return url.replace(re, '$1' + key + '=' + value + '$2$3');
    } else {
      hash = url.split('#');
      url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
      if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
        url += '#' + hash[1];
      }
      return url;
    }
  } else {
    if (typeof value !== 'undefined' && value !== null) {
      separator = url.indexOf('?') !== -1 ? '&' : '?';
      hash = url.split('#');
      url = hash[0] + separator + key + '=' + value;
      if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
        url += '#' + hash[1];
      }
      return url;
    } else {
      return url;
    }
  }
};

getSavedData = function getSavedData(url) {
  var dataString, obj, urlData;
  if (url == null) {
    url = document.URL;
  }
  urlData = getUrl(url).queryKey.vmdata;
  if (!urlData) {
    return;
  }
  dataString = _lzstring2.default.decompressFromEncodedURIComponent(urlData);
  obj = {};
  try {
    return obj = JSON.parse(dataString);
  } finally {
    return obj;
  }
};

var getSaveUrl = function getSaveUrl(vmObject) {
  return function (viewmodel) {
    if (typeof window === 'undefined') return;
    var vmHash = vmObject.getComponentPath(viewmodel);
    viewmodel.vmComputations.push(vmObject.Tracker.autorun(function (c) {
      var data, dataCompressed, dataString, fields, savedData, url;

      url = window.location.href;
      savedData = getSavedData() || {};
      fields = viewmodel.onUrl() instanceof Array ? viewmodel.onUrl() : [viewmodel.onUrl()];
      data = viewmodel.data(fields);
      savedData[vmHash] = data;
      dataString = JSON.stringify(savedData);
      dataCompressed = _lzstring2.default.compressToEncodedURIComponent(dataString);
      url = updateQueryString("vmdata", dataCompressed, url);
      if (!c.firstRun && document.URL !== url && window.history) {
        window.history.pushState(null, null, url);
      }
    }));
  };
};

var getLoadUrl = function getLoadUrl(vmObject) {
  return function (viewmodel) {
    if (typeof window === 'undefined') return;
    var updateFromUrl;
    updateFromUrl = function updateFromUrl(state, title, url) {
      var data, savedData, vmHash;
      if (url == null) {
        url = document.URL;
      }
      data = getSavedData(url);
      if (!data) {
        return;
      }
      vmHash = vmObject.getComponentPath(viewmodel);
      savedData = data[vmHash];
      if (savedData) {
        return viewmodel.load(savedData);
      }
    };
    window.onpopstate = window.history.onstatechange = updateFromUrl;
    updateFromUrl();
  };
};

exports.getSaveUrl = getSaveUrl;
exports.getLoadUrl = getLoadUrl;