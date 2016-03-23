'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _tokens = {
  '**': function _(a, b) {
    return Math.pow(a, b);
  },
  '*': function _(a, b) {
    return a * b;
  },
  '/': function _(a, b) {
    return a / b;
  },
  '%': function _(a, b) {
    return a % b;
  },
  '+': function _(a, b) {
    return a + b;
  },
  '-': function _(a, b) {
    return a - b;
  },
  '<': function _(a, b) {
    return a < b;
  },
  '<=': function _(a, b) {
    return a <= b;
  },
  '>': function _(a, b) {
    return a > b;
  },
  '>=': function _(a, b) {
    return a >= b;
  },
  '==': function _(a, b) {
    return a == b;
  },
  '!==': function _(a, b) {
    return a !== b;
  },
  '===': function _(a, b) {
    return a === b;
  },
  '&&': function _(a, b) {
    return a && b;
  },
  '||': function _(a, b) {
    return a || b;
  }
};

var _tokenGroup = {};
for (var t in _tokens) {
  if (!_tokenGroup[t.length]) {
    _tokenGroup[t.length] = {};
  }
  _tokenGroup[t.length][t] = 1;
}

var Helper = function () {
  function Helper() {
    _classCallCheck(this, Helper);
  }

  _createClass(Helper, null, [{
    key: 'isArray',
    value: function isArray(arr) {
      return arr instanceof Array;
    }
  }, {
    key: 'isObject',
    value: function isObject(obj) {
      return (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === "object" && obj !== null;
    }
  }, {
    key: 'isFunction',
    value: function isFunction(fun) {
      return fun && {}.toString.call(fun) === '[object Function]';
    }
  }, {
    key: 'isString',
    value: function isString(str) {
      return typeof str === 'string' || str instanceof String;
    }
  }, {
    key: 'isNumeric',
    value: function isNumeric(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }
  }, {
    key: 'parseBind',
    value: function parseBind() {}
  }, {
    key: 'isQuoted',
    value: function isQuoted(str) {
      return Helper.stringRegex.test(str);
    }
  }, {
    key: 'removeQuotes',
    value: function removeQuotes(str) {
      return str.substr(1, str.length - 2);
    }
  }, {
    key: 'isPrimitive',
    value: function isPrimitive(val) {
      return val === "true" || val === "false" || val === "null" || val === "undefined" || Helper.isNumeric(val);
    }
  }, {
    key: 'getPrimitive',
    value: function getPrimitive(val) {
      switch (val) {
        case "true":
          return true;
        case "false":
          return false;
        case "null":
          return null;
        case "undefined":
          return void 0;
        default:
          if (Helper.isNumeric(val)) {
            return parseFloat(val);
          } else {
            return val;
          }
      }
    }
  }, {
    key: 'firstToken',
    value: function firstToken(str) {
      var c, candidateToken, i, inQuote, j, k, len, length, token, tokenIndex;
      tokenIndex = -1;
      token = null;
      inQuote = null;
      for (i = j = 0, len = str.length; j < len; i = ++j) {
        c = str[i];
        if (token) {
          break;
        }
        if (c === '"' || c === "'") {
          if (inQuote === c) {
            inQuote = null;
          } else if (!inQuote) {
            inQuote = c;
          }
        } else if (!inQuote && ~"+-*/%&|><=".indexOf(c)) {
          tokenIndex = i;
          for (length = k = 4; k >= 1; length = --k) {
            if (str.length > tokenIndex + length) {
              candidateToken = str.substr(tokenIndex, length);
              if (_tokenGroup[length] && _tokenGroup[length][candidateToken]) {
                token = candidateToken;
                break;
              }
            }
          }
        }
      }
      return [token, tokenIndex];
    }
  }, {
    key: 'getMatchingParenIndex',
    value: function getMatchingParenIndex(bindValue, parenIndexStart) {
      var currentChar, i, j, openParenCount, ref, ref1;
      if (! ~parenIndexStart) {
        return -1;
      }
      openParenCount = 0;
      for (i = j = ref = parenIndexStart + 1, ref1 = bindValue.length; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
        currentChar = bindValue.charAt(i);
        if (currentChar === ')') {
          if (openParenCount === 0) {
            return i;
          } else {
            openParenCount--;
          }
        } else if (currentChar === '(') {
          openParenCount++;
        }
      }
      throw new Error("Unbalanced parenthesis");
    }
  }]);

  return Helper;
}();

exports.default = Helper;


Helper.nextId = 1;
Helper.stringRegex = /^(?:"(?:[^"]|\\")*[^\\]"|'(?:[^']|\\')*[^\\]')$/;
Helper.tokens = _tokens;
Helper.dotRegex = /(\D\.)|(\.\D)/;