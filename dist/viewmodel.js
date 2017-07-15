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

var _viewmodelProperty = require('./viewmodel-property');

var _viewmodelProperty2 = _interopRequireDefault(_viewmodelProperty);

var _parseBind2 = require('./parseBind');

var _parseBind3 = _interopRequireDefault(_parseBind2);

var _bindings = require('./bindings');

var _bindings2 = _interopRequireDefault(_bindings);

var _viewmodelOnUrl = require('./viewmodel-onUrl');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var IS_NATIVE = 'IS_NATIVE';
var ReactDOM = void 0;
var pendingShared = [];
var savedOnUrl = [];

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
    key: 'global',
    value: function global(obj) {
      ViewModel.globals.push(obj);
    }
  }, {
    key: 'prepareRoot',
    value: function prepareRoot() {
      if (!ViewModel.rootComponents) {
        var dep = new ViewModel.Tracker.Dependency();
        ViewModel.rootComponents = new _reactiveArray2.default(dep);
      }
    }
  }, {
    key: 'add',
    value: function add(component) {
      var name = component.vmComponentName;
      if (!ViewModel.components[name]) {
        ViewModel.components[name] = {};
      }
      ViewModel.components[name][component.vmId] = component;
      if (!component.parent()) {
        ViewModel.prepareRoot();
        ViewModel.rootComponents.push(component);
      }
    }
  }, {
    key: 'find',
    value: function find(nameOrPredicate, predicateOrNothing) {
      var onlyOne = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      var name = _helper2.default.isString(nameOrPredicate) && nameOrPredicate;
      var predicate = _helper2.default.isFunction(predicateOrNothing) && predicateOrNothing || _helper2.default.isFunction(nameOrPredicate) && nameOrPredicate;
      var collection = void 0;
      if (name) {
        if (ViewModel.components[name]) collection = { all: ViewModel.components[name] };
      } else {
        collection = ViewModel.components;
      }
      ;
      if (!collection) return [];
      var result = [];
      for (var groupName in collection) {
        var group = collection[groupName];
        for (var item in group) {
          if (!predicate || predicate(group[item])) {
            result.push(group[item]);
            if (onlyOne) return result;
          }
        }
      }
      return result;
    }
  }, {
    key: 'findOne',
    value: function findOne(nameOrPredicate, predicateOrNothing) {
      var results = ViewModel.find(nameOrPredicate, predicateOrNothing, true);
      if (results.length) {
        return results[0];
      }
    }
  }, {
    key: 'mixin',
    value: function mixin(obj) {
      for (var key in obj) {
        ViewModel.mixins[key] = obj[key];
      }
    }
  }, {
    key: 'signal',
    value: function signal(obj) {
      for (var key in obj) {
        ViewModel.signals[key] = obj[key];
      }
    }
  }, {
    key: 'share',
    value: function share(obj) {
      pendingShared.push(obj);
    }
  }, {
    key: 'loadPendingShared',
    value: function loadPendingShared() {
      if (pendingShared.length === 0) return;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = pendingShared[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var obj = _step.value;

          for (var key in obj) {
            ViewModel.shared[key] = {};
            var value = obj[key];
            for (var prop in value) {
              var content = value[prop];
              if (_helper2.default.isFunction(content) || ViewModel.properties[prop]) {
                ViewModel.shared[key][prop] = content;
              } else {
                ViewModel.shared[key][prop] = ViewModel.prop(content);
              }
            }
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      pendingShared.length = 0;
    }
  }, {
    key: 'prop',
    value: function prop(initial, component) {
      var dependency = new ViewModel.Tracker.Dependency();
      var oldChanged = dependency.changed.bind(dependency);
      var components = {};
      if (component && !components[component.vmId]) components[component.vmId] = component;
      dependency.changed = function () {
        for (var key in components) {
          var c = components[key];
          c.vmChange();
        }
        oldChanged();
      };

      var initialValue = initial instanceof ViewModel.Property ? initial.defaultValue : initial;
      var _value = undefined;
      var reset = function reset() {
        if (initialValue instanceof Array) {
          _value = new _reactiveArray2.default(initialValue, dependency);
        } else {
          _value = initialValue;
        }
      };

      reset();

      var validator = initial instanceof ViewModel.Property ? initial : ViewModel.Property.validator(initial);

      var changeValue = function changeValue(value) {
        if (validator.beforeUpdates.length) {
          validator.beforeValueUpdate(value, component);
        }

        if (value instanceof Array) {
          _value = new _reactiveArray2.default(value, dependency);
        } else {
          _value = value;
        }

        if (validator.convertIns.length) {
          _value = validator.convertValueIn(_value, component);
        }

        if (validator.afterUpdates.length) {
          validator.afterValueUpdate(_value, component);
        }

        return dependency.changed();
      };

      var funProp = function funProp(value) {
        if (arguments.length) {
          if (_value !== value) {
            if (funProp.delay > 0) {
              ViewModel.delay(funProp.delay, funProp.vmPropId, function () {
                changeValue(value);
              });
            } else {
              changeValue(value);
            }
          }
        } else {
          dependency.depend();
        }
        if (validator.convertOuts.length) {
          return validator.convertValueOut(_value, component);
        } else {
          return _value;
        }
      };
      funProp.property = validator;
      funProp.reset = function () {
        reset();
        dependency.changed();
      };
      funProp.depend = function () {
        dependency.depend();
      };
      funProp.changed = function () {
        dependency.changed();
      };
      funProp.delay = 0;
      funProp.vmPropId = ViewModel.nextId();
      funProp.addComponent = function (component) {
        if (!components[component.vmId]) components[component.vmId] = component;
      };
      Object.defineProperty(funProp, 'value', {
        get: function get() {
          return _value;
        }
      });

      var hasAsync = validator.hasAsync();
      var validationAsync = { count: 0 };

      var getDone = hasAsync ? function (initialValue) {
        validationAsync.count++;
        return function (result) {
          validationAsync.count--;
          validationAsync.value = initialValue;
          validationAsync.result = result;
          dependency.changed();
        };
      } : void 0;

      funProp.valid = function (noAsync) {
        dependency.depend();
        if (noAsync && funProp.validating()) return false;
        var validSync = validator.verify(_value, component);
        if (!validSync || noAsync || !hasAsync) {
          if (!validSync) {
            return false;
          } else if (hasAsync && validationAsync.value === _value) {
            return validationAsync.result;
          } else {
            return true;
          }
        } else {
          if (validationAsync.value === _value) {
            return validationAsync.result;
          } else {
            validator.verifyAsync(_value, getDone(_value), component);
            return false;
          }
        }
      };

      funProp.validMessage = function () {
        return validator.validMessageValue;
      };

      funProp.invalid = function (noAsync) {
        return !this.valid(noAsync);
      };

      funProp.invalidMessage = function () {
        return validator.invalidMessageValue;
      };

      funProp.validatingMessage = function () {
        return validator.validatingMessageValue;
      };

      funProp.validating = function () {
        if (!hasAsync) {
          return false;
        }
        dependency.depend();
        return !!validationAsync.count;
      };

      funProp.message = function () {
        if (this.valid(true)) {
          return validator.validMessageValue;
        } else {
          return funProp.validating() && validator.validatingMessageValue || validator.invalidMessageValue;
        }
      };

      funProp.validator = validator;

      return funProp;
    }
  }, {
    key: 'getValueRef',
    value: function getValueRef(container, prop) {
      return function (element) {
        container.vmComputations.push(ViewModel.Tracker.autorun(function () {
          var value = container[prop]();
          value = value == null ? "" : value;
          if (element && value != element.value) {
            element.value = value;
          }
        }));
      };
    }
  }, {
    key: 'getValue',
    value: function getValue(container, repeatObject, repeatIndex, bindValue, viewmodel, funPropReserved) {
      var prevContainer = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};

      var value = void 0;
      if (arguments.length < 5) viewmodel = container;
      bindValue = bindValue.trim();
      var ref = _helper2.default.firstToken(bindValue),
          token = ref[0],
          tokenIndex = ref[1];
      if (~tokenIndex) {
        var thisContainer = {
          container: container,
          viewmodel: viewmodel,
          prevContainer: prevContainer
        };
        var left = function left() {
          return ViewModel.getValue(container, repeatObject, repeatIndex, bindValue.substring(0, tokenIndex), viewmodel, prevContainer);
        };
        var right = function right() {
          return ViewModel.getValue(container, repeatObject, repeatIndex, bindValue.substring(tokenIndex + token.length), viewmodel, prevContainer);
        };
        value = _helper2.default.tokens[token.trim()](left, right);
      } else if (bindValue === "this") {
        value = viewmodel;
      } else if (bindValue === "repeatObject") {
        value = repeatObject;
      } else if (bindValue === "repeatIndex") {
        value = repeatIndex;
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
        var breakOnFirstDot = ~dotIndex && (!~parenIndexStart || dotIndex < parenIndexStart || dotIndex === parenIndexEnd + 1);
        if (breakOnFirstDot) {
          var _thisContainer = {
            container: container,
            viewmodel: viewmodel,
            prevContainer: prevContainer
          };
          var newBindValue = bindValue.substring(dotIndex + 1);
          var newBindValueCheck = newBindValue.endsWith('()') ? newBindValue.substr(0, newBindValue.length - 2) : newBindValue;
          var newContainer = ViewModel.getValue(container, repeatObject, repeatIndex, bindValue.substring(0, dotIndex), viewmodel, ViewModel.funPropReserved[newBindValueCheck]);
          value = ViewModel.getValue(newContainer, repeatObject, repeatIndex, newBindValue, viewmodel, undefined, _thisContainer);
        } else {
          if (container == null) {
            value = undefined;
          } else {
            var name = bindValue;
            var args = [];
            if (~parenIndexStart) {
              var parsed = ViewModel.parseBind(bindValue);
              name = Object.keys(parsed)[0];
              var second = parsed[name];
              if (second.length > 2) {
                var ref1 = second.substr(1, second.length - 2).split(',');
                for (var j = 0, _len = ref1.length; j < _len; j++) {
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
                    arg = ViewModel.getValue(viewmodel, repeatObject, repeatIndex, arg, viewmodel);
                    if (viewmodel && arg in viewmodel) {
                      newArg = ViewModel.getValue(viewmodel, repeatObject, repeatIndex, arg, viewmodel);
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
            if (container.vmId && !primitive && !container[name]) {
              container[name] = ViewModel.prop('', viewmodel);
            }
            if (!primitive && !(container != null && (container[name] != null || _helper2.default.isObject(container) || _helper2.default.isString(container)))) {
              var errorMsg = "Can't access '" + name + "' of '" + container + "'.";
              console.error(errorMsg);
            } else if (primitive) {
              value = _helper2.default.getPrimitive(name);
            } else if (!(_helper2.default.isString(container) || name in container)) {
              return undefined;
            } else {
              if (!funPropReserved && _helper2.default.isFunction(container[name])) {
                value = container[name].apply(container, args);
              } else {
                value = container[name];
              }
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
    key: 'getVmValueGetter',
    value: function getVmValueGetter(component, repeatObject, repeatIndex, bindValue) {
      return function () {
        var optBindValue = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : bindValue;

        return ViewModel.getValue(component, repeatObject, repeatIndex, optBindValue.toString(), component);
      };
    }
  }, {
    key: 'getVmValueSetter',
    value: function getVmValueSetter(component, repeatObject, repeatIndex, bindValue) {
      if (!_helper2.default.isString(bindValue)) {
        return function () {};
      }
      if (~bindValue.indexOf(')', bindValue.length - 1)) {
        return function () {
          return ViewModel.getValue(component, repeatObject, repeatIndex, bindValue);
        };
      } else {
        return function (value) {
          ViewModel.setValueFull(value, repeatObject, repeatIndex, component, bindValue, component);
        };
      }
    }
  }, {
    key: 'setValueFull',
    value: function setValueFull(value, repeatObject, repeatIndex, container, bindValue, viewmodel) {
      var i, newBindValue, newContainer;
      var ref = _helper2.default.firstToken(bindValue),
          token = ref[0],
          tokenIndex = ref[1];
      if (_helper2.default.dotRegex.test(bindValue) || ~tokenIndex) {
        if (~tokenIndex) {
          ViewModel.getValue(container, repeatObject, repeatIndex, bindValue, viewmodel);
        } else {
          i = bindValue.search(_helper2.default.dotRegex);
          if (bindValue.charAt(i) !== '.') {
            i += 1;
          }
          newContainer = ViewModel.getValue(container, repeatObject, repeatIndex, bindValue.substring(0, i), viewmodel);
          newBindValue = bindValue.substring(i + 1);
          ViewModel.setValueFull(value, repeatObject, repeatIndex, newContainer, newBindValue, viewmodel);
        }
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
    value: function setValue(viewmodel, repeatObject, repeatIndex, bindValue) {
      if (!_helper2.default.isString(bindValue)) {
        return function () {};
      }
      if (~bindValue.indexOf(')', bindValue.length - 1)) {
        return function () {
          return ViewModel.getValue(viewmodel, repeatObject, repeatIndex, bindValue, viewmodel);
        };
      } else {
        return function (value) {
          return ViewModel.setValueFull(value, repeatObject, repeatIndex, viewmodel, bindValue, viewmodel);
        };
      }
    }
  }, {
    key: 'getClass',
    value: function getClass(component, repeatObject, repeatIndex, initialClass, bindText) {
      var cssClass = [initialClass];
      if (bindText.trim()[0] === '{') {
        var cssObj = ViewModel.parseBind(bindText);
        for (var key in cssObj) {
          var value = cssObj[key];
          if (ViewModel.getValue(component, repeatObject, repeatIndex, value)) {
            cssClass.push(key);
          }
        }
      } else {
        cssClass.push(ViewModel.getValue(component, repeatObject, repeatIndex, bindText));
      }
      return cssClass.join(' ');
    }
  }, {
    key: 'getDisabled',
    value: function getDisabled(component, repeatObject, repeatIndex, isEnabled, bindText) {
      var value = ViewModel.getValue(component, repeatObject, repeatIndex, bindText);
      return !!(isEnabled ? !value : value);
    }
  }, {
    key: 'getStyle',
    value: function getStyle(component, repeatObject, repeatIndex, initialStyle, bindText) {
      var initialStyles = void 0;
      if (!!initialStyle) {
        initialStyles = ViewModel.parseBind(initialStyle.split(";").join(","));
      }

      var objectStyles = void 0;
      if (bindText.trim()[0] === '[') {
        objectStyles = {};
        var itemsString = bindText.substr(1, bindText.length - 2);
        var items = itemsString.split(',');
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = items[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var item = _step2.value;

            var vmValue = ViewModel.getValue(component, repeatObject, repeatIndex, item);
            var bag = _helper2.default.isString(vmValue) ? ViewModel.parseBind(vmValue) : vmValue;
            for (var key in bag) {
              var value = bag[key];
              objectStyles[key] = value;
            }
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      } else if (bindText.trim()[0] === '{') {
        objectStyles = {};
        var preObjectStyles = ViewModel.parseBind(bindText);
        for (var _key in preObjectStyles) {
          var _value2 = preObjectStyles[_key];
          objectStyles[_key] = ViewModel.getValue(component, repeatObject, repeatIndex, _value2);
        }
      } else {
        var _vmValue = ViewModel.getValue(component, repeatObject, repeatIndex, bindText);
        if (_helper2.default.isString(_vmValue)) {
          var newValue = _vmValue.split(";").join(",");
          objectStyles = ViewModel.parseBind(newValue);
        } else {
          objectStyles = _vmValue;
        }
      }

      var styles = {};
      _helper2.default.addStyles(styles, initialStyles);
      _helper2.default.addStyles(styles, objectStyles);
      return styles;
    }
  }, {
    key: 'parseBind',
    value: function parseBind(str) {
      return (0, _parseBind3.default)(str);
    }
  }, {
    key: 'load',
    value: function load(toLoad, container) {
      var component = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : container;

      var loadObj = function loadObj(obj) {
        for (var key in obj) {
          var value = obj[key];
          if (!(ViewModel.properties[key] || ViewModel.reserved[key])) {
            if (_helper2.default.isFunction(value)) {
              container[key] = value;
              if (value.vmPropId) {
                container[key].addComponent(component);
              }
            } else if (container[key] && container[key].vmPropId && _helper2.default.isFunction(container[key])) {
              container[key](value);
            } else {
              container[key] = ViewModel.prop(value, component);
            }
          }
        }
      };
      if (toLoad instanceof Array) {
        for (i = 0, len = toLoad.length; i < len; i++) {
          loadObj(toLoad[i]);
        }
      } else {
        loadObj(toLoad);
      }
    }
  }, {
    key: 'autorunOnce',


    // Special thanks to @dino and @faceyspacey for this implementation
    // shamelessly stolen from their TrackerReact project
    value: function autorunOnce(renderFunc, component) {
      var name = "vmRenderComputation";
      var retValue = void 0;
      // Stop it just in case the autorun never re-ran
      if (component[name] && !component[name].stopped) component[name].stop();

      component[name] = ViewModel.Tracker.nonreactive(function () {
        return ViewModel.Tracker.autorun(function (c) {
          if (c.firstRun) {
            retValue = renderFunc.call(component);
          } else {
            // Stop autorun here so rendering "phase" doesn't have extra work of also stopping autoruns; likely not too
            // important though.
            if (component[name]) component[name].stop();
            component.vmChange();
          }
        });
      });
      return retValue;
    }
  }, {
    key: 'prepareComponentWillMount',
    value: function prepareComponentWillMount(component) {
      var old = component.componentWillMount;
      component.componentWillMount = function () {
        var _this = this;

        var parent = this.props['data-vm-parent'];
        if (parent && parent.children) {
          parent.children().push(this);
        }
        this.parent = function () {
          parent = this.props['data-vm-parent'];
          if (parent && parent.vmId) {
            this.vmDependsOnParent = true;
            return parent;
          } else {
            return undefined;
          }
        };
        this.load(this.props);

        var bind = this.props['data-bind'];
        if (bind) {
          var bindObject = (0, _parseBind3.default)(bind);
          if (bindObject.ref) {
            this.parent()[bindObject.ref] = this;
          }
        }

        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = component.vmCreated[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var fun = _step3.value;

            fun.call(component);
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }

        var oldRender = this.render;
        this.render = function () {
          return ViewModel.autorunOnce(oldRender, _this);
        };
        if (old) old.call(component);
      };
    }
  }, {
    key: 'prepareComponentDidMount',
    value: function prepareComponentDidMount(component) {
      var old = component.componentDidMount;
      var componentDidMount = function componentDidMount() {
        component.vmMounted = true;

        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          var _loop = function _loop() {
            var fun = _step4.value;

            setTimeout(function () {
              return fun.call(component);
            });
          };

          for (var _iterator4 = component.vmRendered[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            _loop();
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }

        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          var _loop2 = function _loop2() {
            var autorun = _step5.value;

            component.vmComputations.push(ViewModel.Tracker.autorun(function (c) {
              autorun.call(component, c);
            }));
          };

          for (var _iterator5 = component.vmAutorun[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            _loop2();
          }
        } catch (err) {
          _didIteratorError5 = true;
          _iteratorError5 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
              _iterator5.return();
            }
          } finally {
            if (_didIteratorError5) {
              throw _iteratorError5;
            }
          }
        }

        if (old) old.call(component);

        component.vmPathToRoot = ViewModel.getPathToRoot(component);
        component.vmPathToParent = ViewModel.getPathToParent(component);

        if (component.onUrl) {
          var saveOnUrl = function saveOnUrl(component) {
            return function () {
              ViewModel.loadUrl(component);
              ViewModel.saveUrl(component);
            };
          };
          var toSave = saveOnUrl(component);
          if (savedOnUrl) {
            savedOnUrl.push(toSave);
          } else {
            toSave();
          }
        }

        if (savedOnUrl && !component.parent()) {
          savedOnUrl.forEach(function (fun) {
            fun();
          });
          savedOnUrl = null;
        }

        ViewModel.add(component);
        component.vmChanged = false;
      };

      component.componentDidMount = componentDidMount;
    }
  }, {
    key: 'prepareComponentWillUnmount',
    value: function prepareComponentWillUnmount(component) {
      var old = component.componentWillUnmount;
      component.componentWillUnmount = function () {
        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;
        var _iteratorError6 = undefined;

        try {

          for (var _iterator6 = component.vmDestroyed[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var _fun = _step6.value;

            _fun.call(component);
          }
        } catch (err) {
          _didIteratorError6 = true;
          _iteratorError6 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
              _iterator6.return();
            }
          } finally {
            if (_didIteratorError6) {
              throw _iteratorError6;
            }
          }
        }

        this.vmComputations.forEach(function (c) {
          return c.stop();
        });
        this.vmRenderComputation.stop();
        delete ViewModel.components[component.vmComponentName][component.vmId];
        if (!component.parent()) {
          for (var i = ViewModel.rootComponents.length - 1; i >= 0; i--) {
            if (ViewModel.rootComponents[i].vmId === component.vmId) {
              ViewModel.rootComponents.splice(i, 1);
              break;
            }
          }
        }

        if (old) old.call(component);
        component.vmMounted = false;
      };
    }
  }, {
    key: 'prepareComponentDidUpdate',
    value: function prepareComponentDidUpdate(component) {
      var old = component.componentDidUpdate;
      component.componentDidUpdate = function () {
        component.vmChanged = false;
        if (old) old.call(component);
      };
    }
  }, {
    key: 'prepareShouldComponentUpdate',
    value: function prepareShouldComponentUpdate(component) {
      if (!component.shouldComponentUpdate) {
        component.shouldComponentUpdate = function () {
          var parent = component.parent();
          if (component.vmChanged || component.vmDependsOnParent && parent.vmChanged) {

            if (parent && !parent.vmChanged && !component.hasOwnProperty('vmUpdateParent')) {
              for (var ref in parent) {
                if (parent[ref] === component) {
                  component.vmUpdateParent = true;
                  break;
                }
              }
              if (!component.vmUpdateParent) {
                // Create the property in the component
                component.vmUpdateParent = false;
              }
            }
            if (component.vmUpdateParent) {
              parent.vmChange();
            }
            return true;
          }

          return false;
        };
      }
    }
  }, {
    key: 'prepareComponentWillReceiveProps',
    value: function prepareComponentWillReceiveProps(component) {
      var old = component.componentWillReceiveProps;
      component.componentWillReceiveProps = function (props) {
        this.load(props);
        if (old) old.call(component);
      };
    }
  }, {
    key: 'prepareMethodsAndProperties',
    value: function prepareMethodsAndProperties(component, initial) {
      for (var prop in initial) {
        if (ViewModel.reactKeyword[prop]) continue;
        if (typeof initial[prop] === 'function') {
          component[prop] = initial[prop].bind(component);
          component[prop].vmIsFunc = true;
        } else {
          component[prop] = ViewModel.prop(initial[prop], component);
        }
      }
    }
  }, {
    key: 'prepareChildren',
    value: function prepareChildren(component) {
      var dependency = new ViewModel.Tracker.Dependency();
      var oldChanged = dependency.changed.bind(dependency);
      dependency.changed = function () {
        component.vmChange();
        oldChanged();
      };
      var array = new _reactiveArray2.default([], dependency);
      var funProp = function funProp(search) {
        array.depend();
        if (arguments.length) {
          var predicate = _helper2.default.isString(search) ? function (vm) {
            return vm.vmComponentName === search;
          } : search;
          return array.filter(predicate);
        } else {
          return array;
        }
      };
      component.children = funProp;
    }
  }, {
    key: 'prepareData',
    value: function prepareData(component) {

      component.data = function () {
        var fields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

        var js = {};
        for (var prop in component) {
          if (component[prop] && component[prop].vmPropId && (fields.length === 0 || ~fields.indexOf(prop))) {
            component[prop].depend();
            var value = component[prop].value;
            if (value instanceof Array) {
              js[prop] = value.array();
            } else {
              js[prop] = value;
            }
          }
        }
        return js;
      };
    }
  }, {
    key: 'prepareValidations',
    value: function prepareValidations(component) {

      component.valid = function () {
        var fields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

        for (var prop in component) {
          if (component[prop] && component[prop].vmPropId && (fields.length === 0 || ~fields.indexOf(prop))) {
            if (!component[prop].valid(true)) {
              return false;
            }
          }
        }
        return true;
      };

      component.validMessages = function () {
        var fields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

        var messages = [];
        for (var prop in component) {
          if (component[prop] && component[prop].vmPropId && (fields.length === 0 || ~fields.indexOf(prop))) {
            if (component[prop].valid(true)) {
              var message = component[prop].validator.validMessageValue;
              if (message) {
                messages.push(message);
              }
            }
          }
        }
        return messages;
      };

      component.invalid = function () {
        var fields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

        return !component.valid(fields);
      };

      component.invalidMessages = function () {
        var fields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

        var messages = [];
        for (var prop in component) {
          if (component[prop] && component[prop].vmPropId && (fields.length === 0 || ~fields.indexOf(prop))) {
            if (!component[prop].valid(true)) {
              var message = component[prop].validating() && component[prop].validator.validatingMessageValue || component[prop].validator.invalidMessageValue;
              if (message) {
                messages.push(message);
              }
            }
          }
        }
        return messages;
      };
    }
  }, {
    key: 'prepareReset',
    value: function prepareReset(component) {

      component.reset = function () {
        for (var prop in component) {
          if (component[prop] && component[prop].vmPropId) {
            component[prop].reset();
          }
        }
      };
    }
  }, {
    key: 'loadMixinShare',
    value: function loadMixinShare(toLoad, collection, component, bag) {
      if (!toLoad) return;
      if (toLoad instanceof Array) {
        var _iteratorNormalCompletion7 = true;
        var _didIteratorError7 = false;
        var _iteratorError7 = undefined;

        try {
          for (var _iterator7 = toLoad[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
            var element = _step7.value;

            if (_helper2.default.isString(element)) {
              component.load(collection[element]);
              bag[element] = null;
            } else {
              ViewModel.loadMixinShare(element, collection, component, bag);
            }
          }
        } catch (err) {
          _didIteratorError7 = true;
          _iteratorError7 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion7 && _iterator7.return) {
              _iterator7.return();
            }
          } finally {
            if (_didIteratorError7) {
              throw _iteratorError7;
            }
          }
        }
      } else if (_helper2.default.isString(toLoad)) {
        component.load(collection[toLoad]);
        bag[toLoad] = null;
      } else {
        for (var ref in toLoad) {
          var container = {};
          var mixshare = toLoad[ref];
          if (mixshare instanceof Array) {
            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
              for (var _iterator8 = mixshare[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                var item = _step8.value;

                ViewModel.load(collection[item], container, component);
                bag[item] = ref;
              }
            } catch (err) {
              _didIteratorError8 = true;
              _iteratorError8 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion8 && _iterator8.return) {
                  _iterator8.return();
                }
              } finally {
                if (_didIteratorError8) {
                  throw _iteratorError8;
                }
              }
            }
          } else {
            ViewModel.load(collection[mixshare], container, component);
            bag[mixshare] = ref;
          }
          component[ref] = container;
        }
      }
    }
  }, {
    key: 'prepareLoad',
    value: function prepareLoad(component) {
      component.load = function (toLoad) {
        if (!toLoad) return;

        // Signals
        var _iteratorNormalCompletion9 = true;
        var _didIteratorError9 = false;
        var _iteratorError9 = undefined;

        try {
          for (var _iterator9 = ViewModel.signalsToLoad(toLoad.signal, component)[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
            var signal = _step9.value;

            component.load(signal);
            component.vmCreated.push(signal.onCreated);
            component.vmDestroyed.push(signal.onDestroyed);
          }

          // Shared
        } catch (err) {
          _didIteratorError9 = true;
          _iteratorError9 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion9 && _iterator9.return) {
              _iterator9.return();
            }
          } finally {
            if (_didIteratorError9) {
              throw _iteratorError9;
            }
          }
        }

        ViewModel.loadPendingShared();
        ViewModel.loadMixinShare(toLoad.share, ViewModel.shared, component, component.vmShares);

        // Mixins
        ViewModel.loadMixinShare(toLoad.mixin, ViewModel.mixins, component, component.vmMixins);

        // Whatever is in 'load' is loaded before direct properties
        component.load(toLoad.load

        // Load the object into the component
        // (direct properties)
        );ViewModel.load(toLoad, component);

        var hooks = {
          created: 'vmCreated',
          rendered: 'vmRendered',
          destroyed: 'vmDestroyed',
          autorun: 'vmAutorun'
        };

        for (var hook in hooks) {
          if (!toLoad[hook]) continue;
          var vmProp = hooks[hook];
          if (toLoad[hook] instanceof Array) {
            var _iteratorNormalCompletion10 = true;
            var _didIteratorError10 = false;
            var _iteratorError10 = undefined;

            try {
              for (var _iterator10 = toLoad[hook][Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                var item = _step10.value;

                component[vmProp].push(item);
              }
            } catch (err) {
              _didIteratorError10 = true;
              _iteratorError10 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion10 && _iterator10.return) {
                  _iterator10.return();
                }
              } finally {
                if (_didIteratorError10) {
                  throw _iteratorError10;
                }
              }
            }
          } else {
            component[vmProp].push(toLoad[hook]);
          }
        }
      };
    }
  }, {
    key: 'prepareComponent',
    value: function prepareComponent(componentName, component, initial) {
      component.vmId = ViewModel.nextId();
      component.vmComponentName = componentName;
      component.vmComputations = [];
      component.vmCreated = [];
      component.vmRendered = [];
      component.vmDestroyed = [];
      component.vmAutorun = [];
      component.vmMixins = {};
      component.vmShares = {};
      component.vmSignals = {};
      var getHasComposition = function getHasComposition(bag) {
        return function (name, prop) {
          return bag.hasOwnProperty(name) && (!bag[name] || bag[name] === prop);
        };
      };
      component.hasMixin = getHasComposition(component.vmMixins);
      component.hasShare = getHasComposition(component.vmShares);
      component.hasSignal = getHasComposition(component.vmSignals);

      component.vmChange = function () {
        if (!component.vmChanged) {
          component.vmChanged = true;
          if (component.vmMounted) {
            component.setState({});
          }
        }
      };

      ViewModel.prepareLoad(component);
      var _iteratorNormalCompletion11 = true;
      var _didIteratorError11 = false;
      var _iteratorError11 = undefined;

      try {
        for (var _iterator11 = ViewModel.globals[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
          var global = _step11.value;

          component.load(global);
        }
      } catch (err) {
        _didIteratorError11 = true;
        _iteratorError11 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion11 && _iterator11.return) {
            _iterator11.return();
          }
        } finally {
          if (_didIteratorError11) {
            throw _iteratorError11;
          }
        }
      }

      component.load(initial);

      ViewModel.prepareChildren(component);
      ViewModel.prepareMethodsAndProperties(component, initial);
      ViewModel.prepareComponentWillMount(component);
      ViewModel.prepareComponentDidMount(component);
      ViewModel.prepareComponentDidUpdate(component);
      ViewModel.prepareComponentWillUnmount(component);
      ViewModel.prepareShouldComponentUpdate(component);
      ViewModel.prepareComponentWillReceiveProps(component);
      ViewModel.prepareValidations(component);
      ViewModel.prepareData(component);
      ViewModel.prepareReset(component);
    }
  }, {
    key: 'addBinding',
    value: function addBinding(binding) {
      if (!binding.priority) binding.priority = 1;
      if (binding.selector) binding.priority += 1;
      if (binding.bindIf) binding.priority += 1;
      if (!ViewModel.bindings[binding.name]) {
        ViewModel.bindings[binding.name] = [];
      }
      ViewModel.bindings[binding.name].push(binding);
    }
  }, {
    key: 'bindElement',
    value: function bindElement(component, repeatObject, repeatIndex, bindingText) {
      return function (element) {
        if (!element || element.vmBound) return;
        element.vmBound = true;

        var bindId = ViewModel.nextId();
        var bindObject = ViewModel.parseBind(bindingText);
        for (var bindName in bindObject) {
          if (ViewModel.compiledBindings[bindName]) continue;
          var bindValue = bindObject[bindName];
          if (~bindName.indexOf(' ')) {
            var _iteratorNormalCompletion12 = true;
            var _didIteratorError12 = false;
            var _iteratorError12 = undefined;

            try {
              for (var _iterator12 = bindName.split(' ')[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
                var bindNameSingle = _step12.value;

                ViewModel.bindSingle(component, repeatObject, repeatIndex, bindObject, element, bindNameSingle, bindId);
              }
            } catch (err) {
              _didIteratorError12 = true;
              _iteratorError12 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion12 && _iterator12.return) {
                  _iterator12.return();
                }
              } finally {
                if (_didIteratorError12) {
                  throw _iteratorError12;
                }
              }
            }
          } else {
            ViewModel.bindSingle(component, repeatObject, repeatIndex, bindObject, element, bindName, bindId);
          }
        }
      };
    }
  }, {
    key: 'bindSingle',
    value: function bindSingle(component, repeatObject, repeatIndex, bindObject, element, bindName, bindId) {
      var bindArg = ViewModel.getBindArgument(component, repeatObject, repeatIndex, bindObject, element, bindName, bindId);
      var binding = ViewModel.getBinding(bindName, bindArg);
      if (!binding) return;

      if (binding.bind) {
        binding.bind(bindArg);
      }
      if (binding.autorun) {
        bindArg.autorun(binding.autorun);
      }

      if (binding.events) {
        var func = function func(eventName, eventFunc) {
          var eventListener = function eventListener(event) {
            eventFunc(bindArg, event);
          };

          bindArg.element.addEventListener(eventName, eventListener);
          bindArg.component.vmDestroyed.push(function () {
            bindArg.element.removeEventListener(eventName, eventListener);
          });
        };
        for (var eventName in binding.events) {
          var eventFunc = binding.events[eventName];
          if (~eventName.indexOf(' ')) {
            var _iteratorNormalCompletion13 = true;
            var _didIteratorError13 = false;
            var _iteratorError13 = undefined;

            try {
              for (var _iterator13 = eventName.split(' ')[Symbol.iterator](), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
                var event = _step13.value;

                func(event, eventFunc);
              }
            } catch (err) {
              _didIteratorError13 = true;
              _iteratorError13 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion13 && _iterator13.return) {
                  _iterator13.return();
                }
              } finally {
                if (_didIteratorError13) {
                  throw _iteratorError13;
                }
              }
            }
          } else {
            func(eventName, eventFunc);
          }
        }
      }
    }
  }, {
    key: 'getComponentPath',
    value: function getComponentPath(component) {
      var path = component.vmComponentName;
      var parent = component.parent();
      if (parent) {
        path = ViewModel.getComponentPath(parent) + component.vmPathToParent + '/' + path;
      } else {
        path = component.vmPathToParent + '/' + path;
      }

      return path;
    }
  }, {
    key: 'getPathToRoot',
    value: function getPathToRoot(component) {
      if (!ReactDOM) {
        ReactDOM = navigator.project === 'ReactNative' ? IS_NATIVE : require('react-dom');
      }

      if (ReactDOM === IS_NATIVE) {
        return '/';
      } else {
        var difference, i, parentPath, viewmodelPath;
        return ViewModel.getElementPath(ReactDOM.findDOMNode(component));
      }
    }
  }, {
    key: 'getPathToParent',
    value: function getPathToParent(component) {
      var difference, i, parentPath, viewmodelPath;
      var parent = component.parent();
      if (!parent) {
        return '/';
      }
      viewmodelPath = component.vmPathToRoot;
      if (!parent.vmPathToRoot) {
        parent.vmPathToRoot = ViewModel.getPathToRoot(parent);
      }
      parentPath = component.parent().vmPathToRoot;

      i = 0;
      while (parentPath[i] === viewmodelPath[i] && parentPath[i] != null) {
        i++;
      }
      difference = viewmodelPath.substr(i);
      return difference;
    }
  }, {
    key: 'getElementPath',
    value: function getElementPath(element) {
      var i, ix, sibling, siblings;
      if (!element || !element.parentNode || element.tagName === 'HTML' || element === document.body) {
        return '/';
      }
      ix = 0;
      siblings = element.parentNode.childNodes;
      i = 0;
      while (i < siblings.length) {
        sibling = siblings[i];
        if (sibling === element) {
          return ViewModel.getElementPath(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
          ix++;
        }
        i++;
      }
    }
  }, {
    key: 'getBinding',
    value: function getBinding(bindName, bindArg) {
      var binding = null;
      var bindingArray = ViewModel.bindings[bindName];
      if (bindingArray) {
        if (bindingArray.length === 1 && !(bindingArray[0].bindIf || bindingArray[0].selector)) {
          binding = bindingArray[0];
        } else {
          binding = bindingArray.sort(function (a, b) {
            b.priority - a.priority;
          }).find(function (b) {
            return !(b.bindIf && !b.bindIf(bindArg) || b.selector && !_helper2.default.elementMatch(bindArg.element, b.selector));
          });
        }
      }
      return binding || ViewModel.getBinding('default', bindArg);
    }
  }, {
    key: 'getBindArgument',
    value: function getBindArgument(component, repeatObject, repeatIndex, bindObject, element, bindName, bindId) {
      var getDelayedSetter = function getDelayedSetter(bindArg, setter) {
        if (bindArg.elementBind.throttle) {
          return function () {
            for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
              args[_key2] = arguments[_key2];
            }

            ViewModel.delay(bindArg.getVmValue(bindArg.elementBind.throttle), bindId, function () {
              setter.apply(undefined, args);
            });
          };
        } else {
          return setter;
        }
      };
      var bindArg = {
        autorun: function autorun(f) {
          var fun = function fun(c) {
            f(bindArg, c);
          };
          component.vmComputations.push(ViewModel.Tracker.autorun(fun));
        },
        component: component,
        element: element,
        elementBind: bindObject,
        bindName: bindName,
        bindValue: bindObject[bindName],
        getVmValue: ViewModel.getVmValueGetter(component, repeatObject, repeatIndex, bindObject[bindName])
      };
      bindArg.setVmValue = getDelayedSetter(bindArg, ViewModel.getVmValueSetter(component, repeatObject, repeatIndex, bindObject[bindName]));
      return bindArg;
    }
  }, {
    key: 'throttle',
    value: function throttle(func, wait, options) {
      var context, args, result;
      var timeout = null;
      var previous = 0;
      if (!options) options = {};
      var later = function later() {
        previous = options.leading === false ? 0 : _.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      };
      return function () {
        var now = _.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          previous = now;
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
          timeout = setTimeout(later, remaining);
        }
        return result;
      };
    }
  }, {
    key: 'signalContainer',
    value: function signalContainer(containerName, container) {
      var all = [];
      if (containerName) {
        var signalObject = ViewModel.signals[containerName];
        for (var key in signalObject) {
          var value = signalObject[key];
          (function (key, value) {
            var single = {};
            single[key] = {};
            var transform = value.transform || function (e) {
              return e;
            };
            var boundProp = '_' + key + '_Bound';
            single.onCreated = function () {
              var vmProp = container[key];
              var func = function func(e) {
                vmProp(transform(e));
              };
              var funcToUse = value.throttle ? ViewModel.throttle(func, value.throttle) : func;
              container[boundProp] = funcToUse;
              value.target.addEventListener(value.event, this[boundProp]);
              var event = document.createEvent('HTMLEvents');
              event.initEvent(value.event, true, false);
              value.target.dispatchEvent(event);
            };
            single.onDestroyed = function () {
              value.target.removeEventListener(value.event, this[boundProp]);
            };
            all.push(single);
          })(key, value);
        }
      }
      return all;
    }
  }, {
    key: 'signalsToLoad',
    value: function signalsToLoad(containerName, container) {
      if (containerName instanceof Array) {
        var signals = [];
        var _iteratorNormalCompletion14 = true;
        var _didIteratorError14 = false;
        var _iteratorError14 = undefined;

        try {
          for (var _iterator14 = containerName[Symbol.iterator](), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
            var name = _step14.value;
            var _iteratorNormalCompletion15 = true;
            var _didIteratorError15 = false;
            var _iteratorError15 = undefined;

            try {
              for (var _iterator15 = ViewModel.signalContainer(name, container)[Symbol.iterator](), _step15; !(_iteratorNormalCompletion15 = (_step15 = _iterator15.next()).done); _iteratorNormalCompletion15 = true) {
                var signal = _step15.value;

                signals.push(signal);
              }
            } catch (err) {
              _didIteratorError15 = true;
              _iteratorError15 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion15 && _iterator15.return) {
                  _iterator15.return();
                }
              } finally {
                if (_didIteratorError15) {
                  throw _iteratorError15;
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError14 = true;
          _iteratorError14 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion14 && _iterator14.return) {
              _iterator14.return();
            }
          } finally {
            if (_didIteratorError14) {
              throw _iteratorError14;
            }
          }
        }

        return signals;
      } else {
        return ViewModel.signalContainer(containerName, container);
      }
    }
  }, {
    key: 'loadComponent',
    value: function loadComponent(comp) {
      var vm = {};
      ViewModel.prepareComponent('TestComponent', vm, null);
      vm.load(comp);
      vm.reset();
      return vm;
    }
  }]);

  return ViewModel;
}();

exports.default = ViewModel;


ViewModel.Tracker = _tracker2.default;

// These are view model properties the user can use
// but they have special meaning to ViewModel
ViewModel.properties = {
  autorun: 1,
  events: 1,
  share: 1,
  mixin: 1,
  signal: 1,
  load: 1,
  rendered: 1,
  created: 1,
  destroyed: 1,
  ref: 1
};

// The user can't use these properties
// when defining a view model
ViewModel.reserved = {
  vmId: 1,
  vmPathToParent: 1,
  vmOnCreated: 1,
  vmOnRendered: 1,
  vmOnDestroyed: 1,
  vmAutorun: 1,
  vmEvents: 1,
  vmInitial: 1,
  vmPropId: 1,
  vmMounted: 1,
  vmElementBind: 1,
  templateInstance: 1,
  parent: 1,
  children: 1,
  child: 1,
  reset: 1,
  data: 1,
  'data-vm-parent': 1,
  'data-bind': 1
};

ViewModel.reactKeyword = {
  render: 1,
  state: 1,
  constructor: 1,
  forceUpdate: 1,
  setState: 1,
  componentWillReceiveProps: 1,
  shouldComponentUpdate: 1,
  componentWillUpdate: 1,
  componentDidUpdate: 1,
  componentWillMount: 1,
  componentDidMount: 1,
  componentWillUnmount: 1
};

ViewModel.funPropReserved = {
  valid: 1,
  validMessage: 1,
  invalid: 1,
  invalidMessage: 1,
  validatingMessage: 1,
  validating: 1,
  validator: 1,
  message: 1,
  reset: 1
};

ViewModel.compiledBindings = {
  text: 1,
  html: 1,
  'class': 1,
  'if': 1,
  'style': 1,
  repeat: 1,
  key: 1
};

ViewModel.globals = [];
ViewModel.components = {};
ViewModel.mixins = {};
ViewModel.shared = {};
ViewModel.signals = {};
ViewModel.bindings = {};

Object.defineProperties(ViewModel, {
  "property": { get: function get() {
      return new _viewmodelProperty2.default();
    } }
});

ViewModel.Property = _viewmodelProperty2.default;
ViewModel.saveUrl = (0, _viewmodelOnUrl.getSaveUrl)(ViewModel);
ViewModel.loadUrl = (0, _viewmodelOnUrl.getLoadUrl)(ViewModel);

var _iteratorNormalCompletion16 = true;
var _didIteratorError16 = false;
var _iteratorError16 = undefined;

try {
  for (var _iterator16 = _bindings2.default[Symbol.iterator](), _step16; !(_iteratorNormalCompletion16 = (_step16 = _iterator16.next()).done); _iteratorNormalCompletion16 = true) {
    var binding = _step16.value;

    ViewModel.addBinding(binding);
  }
} catch (err) {
  _didIteratorError16 = true;
  _iteratorError16 = err;
} finally {
  try {
    if (!_iteratorNormalCompletion16 && _iterator16.return) {
      _iterator16.return();
    }
  } finally {
    if (_didIteratorError16) {
      throw _iteratorError16;
    }
  }
}

var delayed = {};

ViewModel.delay = function (time, nameOrFunc, fn) {
  var d, func, id, name;
  func = fn || nameOrFunc;
  if (fn) {
    name = nameOrFunc;
  }
  if (name) {
    d = delayed[name];
  }
  if (d != null) {
    clearTimeout(d);
  }
  id = setTimeout(func, time);
  if (name) {
    return delayed[name] = id;
  }
};