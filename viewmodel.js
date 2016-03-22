var Tracker = require('./tracker');

var ViewModel;

ViewModel = (function() {
  function ViewModel() {}

  ViewModel.prop = function(initialValue, component) {
    const _dep = new Tracker.Dependency();
    let _value = initialValue;
    const funProp = function(value) {
      if (arguments.length){
        if (_value !== value){
          _value = value;
          _dep.changed();
          this.setState({
            vmChanged: 1
          })
        }

      } else {
        _dep.depend();
      }
      return _value;
    };
    funProp.vmProp = true;
    funProp.depend = function() {
      _dep.depend();
    };
    return funProp;
  }
  
  return ViewModel;

})();

var PropManager;

PropManager = (function() {
  var _t, dotRegex, firstToken, getMatchingParenIndex, getPrimitive, getValue, isPrimitive, quoted, removeQuotes, setValue, stringRegex, tokenGroup, tokens;

  var isObject = function(obj) {
    return (typeof obj === "object") && (obj !== null);
  }
  var isFunction = function(fun) {
    var getType = {};
    return fun && getType.toString.call(fun) === '[object Function]';
  }

  var isString = function(str) {
    return typeof str === 'string' || str instanceof String;
  }

  var isNumeric = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  function PropManager() {}

  stringRegex = /^(?:"(?:[^"]|\\")*[^\\]"|'(?:[^']|\\')*[^\\]')$/;

  quoted = function(str) {
    return stringRegex.test(str);
  };

  removeQuotes = function(str) {
    return str.substr(1, str.length - 2);
  };

  isPrimitive = function(val) {
    return val === "true" || val === "false" || val === "null" || val === "undefined" || isNumeric(val);
  };

  getPrimitive = function(val) {
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
        if (isNumeric(val)) {
          return parseFloat(val);
        } else {
          return val;
        }
    }
  };

  tokens = {
    '**': function(a, b) {
      return Math.pow(a, b);
    },
    '*': function(a, b) {
      return a * b;
    },
    '/': function(a, b) {
      return a / b;
    },
    '%': function(a, b) {
      return a % b;
    },
    '+': function(a, b) {
      return a + b;
    },
    '-': function(a, b) {
      return a - b;
    },
    '<': function(a, b) {
      return a < b;
    },
    '<=': function(a, b) {
      return a <= b;
    },
    '>': function(a, b) {
      return a > b;
    },
    '>=': function(a, b) {
      return a >= b;
    },
    '==': function(a, b) {
      return a == b;
    },
    '!==': function(a, b) {
      return a !== b;
    },
    '===': function(a, b) {
      return a === b;
    },
    '!===': function(a, b) {
      return a !== b;
    },
    '&&': function(a, b) {
      return a && b;
    },
    '||': function(a, b) {
      return a || b;
    }
  };

  tokenGroup = {};

  for (_t in tokens) {
    if (!tokenGroup[_t.length]) {
      tokenGroup[_t.length] = {};
    }
    tokenGroup[_t.length][_t] = 1;
  }

  dotRegex = /(\D\.)|(\.\D)/;

  firstToken = function(str) {
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
            if (tokenGroup[length] && tokenGroup[length][candidateToken]) {
              token = candidateToken;
              break;
            }
          }
        }
      }
    }
    return [token, tokenIndex];
  };

  getMatchingParenIndex = function(bindValue, parenIndexStart) {
    var currentChar, i, j, openParenCount, ref, ref1;
    if (!~parenIndexStart) {
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
  };

  getValue = function(container, bindValue, viewmodel) {
    var arg, args, breakOnFirstDot, dotIndex, errorMsg, j, left, len, name, neg, negate, newArg, newBindValue, newContainer, parenIndexEnd, parenIndexStart, parsed, primitive, ref, ref1, right, second, token, tokenIndex, value;
    bindValue = bindValue.trim();
    ref = firstToken(bindValue), token = ref[0], tokenIndex = ref[1];
    if (~tokenIndex) {
      left = getValue(container, bindValue.substring(0, tokenIndex), viewmodel);
      right = getValue(container, bindValue.substring(tokenIndex + token.length), viewmodel);
      value = tokens[token.trim()](left, right);
    } else if (bindValue === "this") {
      value = viewmodel;
    } else if (quoted(bindValue)) {
      value = removeQuotes(bindValue);
    } else {
      negate = bindValue.charAt(0) === '!';
      if (negate) {
        bindValue = bindValue.substring(1);
      }
      dotIndex = bindValue.search(dotRegex);
      if (~dotIndex && bindValue.charAt(dotIndex) !== '.') {
        dotIndex += 1;
      }
      parenIndexStart = bindValue.indexOf('(');
      parenIndexEnd = getMatchingParenIndex(bindValue, parenIndexStart);
      breakOnFirstDot = ~dotIndex && (!~parenIndexStart || dotIndex < parenIndexStart || dotIndex === (parenIndexEnd + 1));
      if (breakOnFirstDot) {
        newContainer = getValue(container, bindValue.substring(0, dotIndex), viewmodel);
        newBindValue = bindValue.substring(dotIndex + 1);
        value = getValue(newContainer, newBindValue, viewmodel);
      } else {
        name = bindValue;
        args = [];
        if (~parenIndexStart) {
          parsed = ViewModel.parseBind(bindValue);
          name = Object.keys(parsed)[0];
          second = parsed[name];
          if (second.length > 2) {
            ref1 = second.substr(1, second.length - 2).split(',');
            for (j = 0, len = ref1.length; j < len; j++) {
              arg = ref1[j];
              arg = arg.trim();
              newArg = void 0;
              if (arg === "this") {
                newArg = viewmodel;
              } else if (quoted(arg)) {
                newArg = removeQuotes(arg);
              } else {
                neg = arg.charAt(0) === '!';
                if (neg) {
                  arg = arg.substring(1);
                }
                arg = getValue(viewmodel, arg, viewmodel);
                if (viewmodel && arg in viewmodel) {
                  newArg = getValue(viewmodel, arg, viewmodel);
                } else {
                  newArg = arg;
                }
                if (neg) {
                  newArg = !newArg;
                }
              }
              args.push(newArg);
            }
          }
        }
        primitive = isPrimitive(name);
        if (container instanceof ViewModel && !primitive && !container[name]) {
          container[name] = ViewModel.makeReactiveProperty(void 0);
        }
        if (!primitive && !((container != null) && ((container[name] != null) || isObject(container)))) {
          errorMsg = "Can't access '" + name + "' of '" + container + "'.";
          console.error(errorMsg);
        } else if (primitive || !name in container) {
          value = getPrimitive(name);
        } else {
          if (isFunction(container[name])) {
            value = container[name].apply(container, args);
          } else {
            value = container[name];
          }
        }
      }
      if (negate) {
        value = !value;
      }
    }
    return value;
  };

  PropManager.getValue = function(viewmodel, bindValue) {
    return getValue(viewmodel, bindValue, viewmodel);
  };

  setValue = function(value, container, bindValue, viewmodel) {
    var i, newBindValue, newContainer;
    if (dotRegex.test(bindValue)) {
      i = bindValue.search(dotRegex);
      if (bindValue.charAt(i) !== '.') {
        i += 1;
      }
      newContainer = getValue(container, bindValue.substring(0, i), viewmodel);
      newBindValue = bindValue.substring(i + 1);
      setValue(value, newContainer, newBindValue, viewmodel);
    } else {
      if (isFunction(container[bindValue])) {
        container[bindValue](value);
      } else {
        container[bindValue] = value;
      }
    }
  };

  PropManager.setValue = function(viewmodel, bindValue) {
    if (!isString(bindValue)) {
      return (function() {});
    }
    if (~bindValue.indexOf(')', bindValue.length - 1)) {
      return function() {
        return getValue(viewmodel, bindValue, viewmodel);
      };
    } else {
      return function(value) {
        return setValue(value, viewmodel, bindValue, viewmodel);
      };
    }
  };
  
  PropManager.setInputValue = function(viewmodel, bindValue) {
    var valueSetter = PropManager.setValue(viewmodel, bindValue);
    return function(event) {
      valueSetter(event.target.value);
    }
  };

  return PropManager;

})();


ViewModel.getValue = PropManager.getValue;
ViewModel.setValue = PropManager.setValue;
ViewModel.setInputValue = PropManager.setInputValue;
ViewModel.Tracker = Tracker;


module.exports = ViewModel;