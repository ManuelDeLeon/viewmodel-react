const tokenized = {};
const tokenizedNone = {};
const regexChars = /[\+\-\*\/%&\|><=!]/;
const _tokens = {
  "**": function(a, b) {
    return a() ** b();
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
  "!=": function(a, b) {
    return a() != b();
  },
  "===": function(a, b) {
    return a() === b();
  },
  "!==": function(a, b) {
    return a() !== b();
  },
  "&&": function(a, b) {
    return a() && b();
  },
  "||": function(a, b) {
    return a() || b();
  }
};

let _tokenGroup = {};
for (let t in _tokens) {
  if (!_tokenGroup[t.length]) {
    _tokenGroup[t.length] = {};
  }
  _tokenGroup[t.length][t] = 1;
}

function allBlankCharCodes(str) {
  var l = str.length,
    a;
  for (var i = 0; i < l; i++) {
    a = str.charCodeAt(i);
    if (
      (a < 9 || a > 13) &&
      a !== 32 &&
      a !== 133 &&
      a !== 160 &&
      a !== 5760 &&
      a !== 6158 &&
      (a < 8192 || a > 8205) &&
      a !== 8232 &&
      a !== 8233 &&
      a !== 8239 &&
      a !== 8287 &&
      a !== 8288 &&
      a !== 12288 &&
      a !== 65279
    ) {
      return false;
    }
  }
  return true;
}

function fastIsNumeric(n) {
  var type = typeof n;
  if (type === "string") {
    var original = n;
    n = +n;
    // whitespace strings cast to zero - filter them out
    if (n === 0 && allBlankCharCodes(original)) return false;
  } else if (type !== "number") return false;

  return n - n < 1;
}

class Helper {
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
    //return !isNaN(parseFloat(n)) && isFinite(n);
    return fastIsNumeric(n);
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

  static trim(s) {
    let str = s.replace(/^\s+/, "");
    for (var i = str.length - 1; i >= 0; i--) {
      if (/\S/.test(str.charAt(i))) {
        str = str.substring(0, i + 1);
        break;
      }
    }
    return str;
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
    if (tokenizedNone[str]) return [, -1];
    const retToken = tokenized[str];
    if (retToken) return retToken;

    if (!regexChars.test(str)) {
      tokenizedNone[str] = 1;
      return [, -1];
    }
    let c, candidateToken, i, inQuote, j, k, len, length, token, tokenIndex;
    tokenIndex = -1;
    token = null;
    inQuote = null;
    let afterComma = false;
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
      } else if (!afterComma && !inQuote && ~"+-*/%&|><=!".indexOf(c)) {
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

      if (c === ",") {
        afterComma = true;
      } else if (afterComma && c !== " ") {
        afterComma = false;
      }
    }
    if (tokenIndex >= 0) {
      return (tokenized[str] = [token, tokenIndex]);
    } else {
      tokenizedNone[str] = 1;
      return [, -1];
    }
  }

  static getMatchingParenIndex(bindValue, parenIndexStart) {
    let currentChar, i, j, openParenCount, ref, ref1;
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
      el.oMatchesSelector
    ).call(el, selector);
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

export default Helper;
