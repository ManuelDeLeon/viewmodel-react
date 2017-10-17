"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _bindingToken, _divisionLookBehind, _keywordRegexLookBehind, _operators, everyThingElse, oneNotSpace, specials, stringDouble, stringRegexp, stringSingle;

stringDouble = '"(?:[^"\\\\]|\\\\.)*"';

stringSingle = "'(?:[^'\\\\]|\\\\.)*'";

stringRegexp = "/(?:[^/\\\\]|\\\\.)*/w*";

specials = ",\"'{}()/:[\\]";

everyThingElse = "[^\\s:,/][^" + specials + "]*[^\\s" + specials + "]";

oneNotSpace = "[^\\s]";

_bindingToken = RegExp(stringDouble + "|" + stringSingle + "|" + stringRegexp + "|" + everyThingElse + "|" + oneNotSpace, "g");

_divisionLookBehind = /[\])"'A-Za-z0-9_$]+$/;

_keywordRegexLookBehind = {
  in: 1,
  return: 1,
  typeof: 1
};

_operators = "+-*/&|=><";

var parseBind = function parseBind(objectLiteralString) {
  var c, depth, i, key, match, result, str, tok, toks, v, values;
  str = objectLiteralString && objectLiteralString.trim();
  if (str.charCodeAt(0) === 123) {
    str = str.slice(1, -1);
  }
  result = {};
  toks = str.match(_bindingToken);
  depth = 0;
  key = void 0;
  values = void 0;
  if (toks) {
    toks.push(",");
    i = -1;
    tok = void 0;
    while (tok = toks[++i]) {
      c = tok.charCodeAt(0);
      if (c === 44) {
        if (depth <= 0) {
          if (key) {
            if (!values) {
              result["unknown"] = key;
            } else {
              v = values.join("");
              if (v.indexOf("{") === 0) {
                v = parseBind(v);
              }
              result[key] = v;
            }
          }
          key = values = depth = 0;
          continue;
        }
      } else if (c === 58) {
        if (!values) {
          continue;
        }
      } else if (c === 47 && i && tok.length > 1) {
        match = toks[i - 1].match(_divisionLookBehind);
        if (match && !_keywordRegexLookBehind[match[0]]) {
          str = str.substr(str.indexOf(tok) + 1);
          toks = str.match(_bindingToken);
          toks.push(",");
          i = -1;
          tok = "/";
        }
      } else if (c === 40 || c === 123 || c === 91) {
        ++depth;
      } else if (c === 41 || c === 125 || c === 93) {
        --depth;
      } else if (!key && !values) {
        key = c === 34 || c === 39 ? tok.slice(1, -1) : tok;
        continue;
      }
      if (~_operators.indexOf(tok[0])) {
        tok = " " + tok;
      }
      if (~_operators.indexOf(tok[tok.length - 1])) {
        tok += " ";
      }
      if (values) {
        values.push(tok);
      } else {
        values = [tok];
      }
    }
  }
  return result;
};

exports.default = parseBind;