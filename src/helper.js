const _tokens = {
  "**": function(a, b) {
    return Math.pow(a, b);
  },
  "*": function(a, b) {
    return a() * b();
  },
  "/": function(a, b) {
    return a() / b();
  },
  "%": function(a, b) {
    return a() % b();
  },
  "+": function(a, b) {
    return a() + b();
  },
  "-": function(a, b) {
    return a() - b();
  },
  "<": function(a, b) {
    return a() < b();
  },
  "<=": function(a, b) {
    return a() <= b();
  },
  ">": function(a, b) {
    return a() > b();
  },
  ">=": function(a, b) {
    return a() >= b();
  },
  "==": function(a, b) {
    return a() == b();
  },
  "!==": function(a, b) {
    return a() !== b();
  },
  "===": function(a, b) {
    return a() === b();
  },
  "&&": function(a, b) {
    return a() && b();
  },
  "||": function(a, b) {
    return a() || b();
  }
};

const _tokenGroup = {};
for (let t in _tokens) {
  if (!_tokenGroup[t.length]) {
    _tokenGroup[t.length] = {};
  }
  _tokenGroup[t.length][t] = 1;
}

export default class Helper {
  static isArray(arr) {
    return arr instanceof Array;
  }
  static isObject(obj) {
    return typeof obj === "object" && obj !== null && !(obj instanceof Date);
  }
  static isFunction(fun) {
    return fun && {}.toString.call(fun) === "[object Function]";
  }
  static isString(str) {
    return typeof str === "string" || str instanceof String;
  }
  static isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  static isQuoted(str) {
    return Helper.stringRegex.test(str);
  }
  static removeQuotes(str) {
    return str.substr(1, str.length - 2);
  }

  static isPrimitive(val) {
    return (
      val === "true" ||
      val === "false" ||
      val === "null" ||
      val === "undefined" ||
      Helper.isNumeric(val)
    );
  }

  static getPrimitive(val) {
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

  static firstToken(str) {
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

  static getMatchingParenIndex(bindValue, parenIndexStart) {
    var currentChar, i, j, openParenCount, ref, ref1;
    if (!~parenIndexStart) {
      return -1;
    }
    openParenCount = 0;
    for (
      i = j = ref = parenIndexStart + 1, ref1 = bindValue.length;
      ref <= ref1 ? j <= ref1 : j >= ref1;
      i = ref <= ref1 ? ++j : --j
    ) {
      currentChar = bindValue.charAt(i);
      if (currentChar === ")") {
        if (openParenCount === 0) {
          return i;
        } else {
          openParenCount--;
        }
      } else if (currentChar === "(") {
        openParenCount++;
      }
    }
    throw new Error("Unbalanced parenthesis");
  }

  static elementMatch(el, selector) {
    return (el.matches ||
      el.matchesSelector ||
      el.msMatchesSelector ||
      el.mozMatchesSelector ||
      el.webkitMatchesSelector ||
      el.oMatchesSelector)
      .call(el, selector);
  }

  static reactStyle(str) {
    if (!~str.indexOf("-")) return str;
    let retVal = "";
    for (let block of str.split("-")) {
      if (retVal) {
        retVal += block[0].toUpperCase() + block.substr(1);
      } else {
        retVal += block;
      }
    }
    return retVal;
  }

  static addStyles(obj, styles) {
    if (styles) {
      for (let style in styles) {
        obj[Helper.reactStyle(style)] = styles[style];
      }
    }
  }
}

Helper.nextId = 1;
Helper.stringRegex = /^(?:"(?:[^"]|\\")*[^\\]"|'(?:[^']|\\')*[^\\]')$/;
Helper.tokens = _tokens;
Helper.dotRegex = /(\D\.)|(\.\D)/;
