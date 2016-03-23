'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _tracker = require('./tracker');

var _tracker2 = _interopRequireDefault(_tracker);

var _helper = require('./helper');

var _helper2 = _interopRequireDefault(_helper);

var _reactiveArray = require('./reactive-array');

var _reactiveArray2 = _interopRequireDefault(_reactiveArray);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ViewModel = function () {
  function ViewModel() {
    _classCallCheck(this, ViewModel);
  }

  _createClass(ViewModel, null, [{
    key: 'nextId',
    value: function nextId() {
      return _helper2.default.nextId++;
    }
  }, {
    key: 'prop',
    value: function prop(initial, component) {
      var dependency = new _tracker2.default.Dependency();
      var initialValue = _helper2.default.isArray(initial) ? new _reactiveArray2.default(initial, dependency) : initial;
      var _value = initialValue;
      var changeValue = function changeValue(value) {
        if (value instanceof Array) {
          _value = new _reactiveArray2.default(value, dependency);
        } else {
          _value = value;
        }
        component.setState({ vmChanged: true });
        return dependency.changed();
      };
      var funProp = function funProp(value) {
        if (arguments.length) {
          if (_value !== value) {
            if (funProp.delay > 0) {
              ViewModel.delay(funProp.delay, funProp.vmProp, function () {
                changeValue(value);
              });
            } else {
              changeValue(value);
            }
          }
        } else {
          dependency.depend();
        }
        return _value;
      };
      funProp.reset = function () {
        if (_value instanceof _reactiveArray2.default) {
          _value = new _reactiveArray2.default(initial, dependency);
        } else {
          _value = initialValue;
        }
        dependency.changed();
      };
      funProp.depend = function () {
        dependency.depend();
      };
      funProp.changed = function () {
        dependency.changed();
      };
      funProp.delay = 0;
      funProp.vmProp = ViewModel.nextId();
      Object.defineProperty(funProp, 'value', {
        get: function get() {
          return _value;
        }
      });
      return funProp;
    }
  }, {
    key: 'getValue',
    value: function getValue(container, bindValue, viewmodel) {
      var value = void 0;
      if (arguments.length < 3) viewmodel = container;
      bindValue = bindValue.trim();
      var ref = _helper2.default.firstToken(bindValue),
          token = ref[0],
          tokenIndex = ref[1];
      if (~tokenIndex) {
        var left = ViewModel.getValue(container, bindValue.substring(0, tokenIndex), viewmodel);
        var right = ViewModel.getValue(container, bindValue.substring(tokenIndex + token.length), viewmodel);
        value = _helper2.default.tokens[token.trim()](left, right);
      } else if (bindValue === "this") {
        value = viewmodel;
      } else if (_helper2.default.isQuoted(bindValue)) {
        value = _helper2.default.removeQuotes(bindValue);
      } else {
        var negate = bindValue.charAt(0) === '!';
        if (negate) {
          bindValue = bindValue.substring(1);
        }
        var dotIndex = bindValue.search(_helper2.default.dotRegex);
        if (~dotIndex && bindValue.charAt(dotIndex) !== '.') {
          dotIndex += 1;
        }
        var parenIndexStart = bindValue.indexOf('(');
        var parenIndexEnd = _helper2.default.getMatchingParenIndex(bindValue, parenIndexStart);
        var breakOnFirstDot = ~dotIndex && (! ~parenIndexStart || dotIndex < parenIndexStart || dotIndex === parenIndexEnd + 1);
        if (breakOnFirstDot) {
          var newContainer = ViewModel.getValue(container, bindValue.substring(0, dotIndex), viewmodel);
          var newBindValue = bindValue.substring(dotIndex + 1);
          value = ViewModel.getValue(newContainer, newBindValue, viewmodel);
        } else {
          var name = bindValue;
          var args = [];
          if (~parenIndexStart) {
            var parsed = _helper2.default.parseBind(bindValue);
            name = Object.keys(parsed)[0];
            var second = parsed[name];
            if (second.length > 2) {
              var ref1 = second.substr(1, second.length - 2).split(',');
              for (j = 0, len = ref1.length; j < len; j++) {
                var arg = ref1[j].trim();
                var newArg = void 0;
                if (arg === "this") {
                  newArg = viewmodel;
                } else if (_helper2.default.isQuoted(arg)) {
                  newArg = _helper2.default.removeQuotes(arg);
                } else {
                  var neg = arg.charAt(0) === '!';
                  if (neg) {
                    arg = arg.substring(1);
                  }
                  arg = ViewModel.getValue(viewmodel, arg, viewmodel);
                  if (viewmodel && arg in viewmodel) {
                    newArg = ViewModel.getValue(viewmodel, arg, viewmodel);
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
          var primitive = _helper2.default.isPrimitive(name);
          if (container instanceof ViewModel && !primitive && !container[name]) {
            container[name] = ViewModel.prop(undefined, viewmodel);
          }
          if (!primitive && !(container != null && (container[name] != null || _helper2.default.isObject(container)))) {
            var errorMsg = "Can't access '" + name + "' of '" + container + "'.";
            console.error(errorMsg);
          } else if (primitive || !name in container) {
            value = _helper2.default.getPrimitive(name);
          } else {
            if (_helper2.default.isFunction(container[name])) {
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
    }
  }, {
    key: 'setValueFull',
    value: function setValueFull(value, container, bindValue, viewmodel) {
      var i, newBindValue, newContainer;
      if (_helper2.default.dotRegex.test(bindValue)) {
        i = bindValue.search(_helper2.default.dotRegex);
        if (bindValue.charAt(i) !== '.') {
          i += 1;
        }
        newContainer = ViewModel.getValue(container, bindValue.substring(0, i), viewmodel);
        newBindValue = bindValue.substring(i + 1);
        ViewModel.setValue(value, newContainer, newBindValue, viewmodel);
      } else {
        if (_helper2.default.isFunction(container[bindValue])) {
          container[bindValue](value);
        } else {
          container[bindValue] = value;
        }
      }
    }
  }, {
    key: 'setValue',
    value: function setValue(viewmodel, bindValue) {
      if (!_helper2.default.isString(bindValue)) {
        return function () {};
      }
      if (~bindValue.indexOf(')', bindValue.length - 1)) {
        return function () {
          return ViewModel.getValue(viewmodel, bindValue, viewmodel);
        };
      } else {
        return function (value) {
          return ViewModel.setValueFull(value, viewmodel, bindValue, viewmodel);
        };
      }
    }
  }, {
    key: 'setInputValue',
    value: function setInputValue(viewmodel, bindValue) {
      var valueSetter = ViewModel.setValue(viewmodel, bindValue);
      return function (event) {
        valueSetter(event.target.value);
      };
    }
  }]);

  return ViewModel;
}();

exports.default = ViewModel;


ViewModel.Tracker = _tracker2.default;