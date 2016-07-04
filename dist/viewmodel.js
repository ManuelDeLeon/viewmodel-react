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

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _bindings = require('./bindings');

var _bindings2 = _interopRequireDefault(_bindings);

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
    key: 'global',
    value: function global(obj) {
      ViewModel.globals.push(obj);
    }
  }, {
    key: 'add',
    value: function add(component) {
      var name = component.vmComponentName;
      if (!ViewModel.components[name]) {
        ViewModel.components[name] = {};
      }
      ViewModel.components[name][component.vmId] = component;
    }
  }, {
    key: 'find',
    value: function find(nameOrPredicate, predicateOrNothing) {
      var onlyOne = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

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
    key: 'share',
    value: function share(obj) {
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
          if (!c.vmChanged) {
            c.vmChanged = true;
            c.setState({});
          }
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
          validator.beforeValueUpdate(_value, component);
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
      var validDependency = hasAsync && new _tracker2.default.Dependency();
      var validatingItems = hasAsync && new _reactiveArray2.default([], new ViewModel.Tracker.Dependency());
      var validationAsync = {};

      var getDone = hasAsync ? function (initialValue) {
        validatingItems.push(1);
        return function (result) {
          validatingItems.pop();

          if (_value === initialValue && validationAsync.value !== _value) {
            validationAsync = {
              value: _value,
              result: result
            };
          }
          component.vmChanged = true;
          component.setState({});
        };
      } : void 0;

      funProp.valid = function (noAsync) {

        dependency.depend();
        if (hasAsync) {
          validDependency.depend();
        }
        if (validationAsync.value === _value) {
          var retVal = validationAsync.result;
          if (!validatingItems.length) {
            //validationAsync = {};
          }
          return retVal;
        } else {
          if (hasAsync && !noAsync) {
            validator.verifyAsync(_value, getDone(_value), component);
          }
          return validator.verify(_value, component);
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

      funProp.validating = function () {
        if (!hasAsync) {
          return false;
        }
        validatingItems.depend();
        return !!validatingItems.length;
      };

      funProp.message = function () {
        if (this.valid(true)) {
          return validator.validMessageValue;
        } else {
          return validator.invalidMessageValue;
        }
      };

      return funProp;
    }
  }, {
    key: 'getValueRef',
    value: function getValueRef(container, prop) {
      return function (element) {
        container.vmAutorun.push(ViewModel.Tracker.autorun(function () {
          var value = container[prop]();
          value = value == null ? "" : value;
          if (element && value != element.value) {
            element.value = value;
          }
        }));
      };
    }
  }, {
    key: 'getCheckHook',
    value: function getCheckHook(container, prop, isCheck) {
      var valueSetter = ViewModel.setValue(container, prop);
      return function (element, force) {
        if (!force && (!element || element.vmCheckHook)) return;
        element.vmCheckHook = true;

        var changeListener = function changeListener() {
          if (isCheck || element.type === "checkbox") {
            valueSetter(element.checked);
          } else if (element.type === "radio" && element.checked) {
            valueSetter(element.value);
            if (element.name) {
              (function () {
                var inputs = _reactDom2.default.findDOMNode(container).querySelectorAll('input[type=radio][name=' + element.name + ']');
                var event = new Event('change');
                Array.prototype.forEach.call(inputs, function (input, i) {
                  if (input !== element) {
                    input.dispatchEvent(event);
                  }
                });
              })();
            }
          }
        };

        element.addEventListener('change', changeListener);
        container.vmDestroyed.push(function () {
          element.removeEventListener('change', changeListener);
        });

        container.vmAutorun.push(ViewModel.Tracker.autorun(function () {

          var value = ViewModel.getValue(container, prop);
          var elementValue = element.type === "checkbox" ? element.checked : element.value;
          if (element) {
            if (value != element.checked) {
              element.checked = value === elementValue;
            }
          }
        }));
      };
    }
  }, {
    key: 'getGroupHook',
    value: function getGroupHook(container, prop, hasCheck, checkProp) {
      var checkHook = hasCheck && ViewModel.getCheckHook(container, checkProp, true);
      return function (element) {
        if (!element || element.vmGroupHook) return;
        element.vmGroupHook = true;
        if (checkHook) {
          checkHook(element);
        }
        if (element.type === "radio") {
          ViewModel.getCheckHook(container, prop)(element, true);
          return;
        }

        var changeListener = function changeListener() {
          var array = ViewModel.getValue(container, prop);
          var elementValue = element.value;
          if (element.checked) {
            if (!~array.indexOf(elementValue)) {
              array.push(elementValue);
            }
          } else {
            array.remove(elementValue);
          }
        };
        element.addEventListener('change', changeListener);
        container.vmDestroyed.push(function () {
          element.removeEventListener('change', changeListener);
        });

        container.vmAutorun.push(ViewModel.Tracker.autorun(function () {
          var array = ViewModel.getValue(container, prop);
          if (!element) return;
          var inArray = !!~array.indexOf(element.value);

          if (element.checked != inArray) {
            element.checked = inArray;
          }
        }));
      };
    }
  }, {
    key: 'getValue',
    value: function getValue(container, bindValue, viewmodel, funPropReserved) {
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
        var breakOnFirstDot = ~dotIndex && (!~parenIndexStart || dotIndex < parenIndexStart || dotIndex === parenIndexEnd + 1);
        if (breakOnFirstDot) {
          var newBindValue = bindValue.substring(dotIndex + 1);
          var newBindValueCheck = newBindValue.endsWith('()') ? newBindValue.substr(0, newBindValue.length - 2) : newBindValue;
          var newContainer = ViewModel.getValue(container, bindValue.substring(0, dotIndex), viewmodel, ViewModel.funPropReserved[newBindValueCheck]);
          value = ViewModel.getValue(newContainer, newBindValue, viewmodel);
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
          if (container.vmId && !primitive && !container[name]) {
            container[name] = ViewModel.prop('', viewmodel);
          }
          if (!primitive && !(container != null && (container[name] != null || _helper2.default.isObject(container)))) {
            var errorMsg = "Can't access '" + name + "' of '" + container + "'.";
            console.error(errorMsg);
          } else if (primitive || !name in container) {
            value = _helper2.default.getPrimitive(name);
          } else {
            if (!funPropReserved && _helper2.default.isFunction(container[name])) {
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
    key: 'getVmValueGetter',
    value: function getVmValueGetter(component, bindValue) {
      return function () {
        var optBindValue = arguments.length <= 0 || arguments[0] === undefined ? bindValue : arguments[0];

        return ViewModel.getValue(component, optBindValue.toString(), component);
      };
    }
  }, {
    key: 'getVmValueSetter',
    value: function getVmValueSetter(component, bindValue) {
      if (!_helper2.default.isString(bindValue)) {
        return function () {};
      }
      if (~bindValue.indexOf(')', bindValue.length - 1)) {
        return function () {
          return ViewModel.getValue(component, bindValue);
        };
      } else {
        return function (value) {
          ViewModel.setValueFull(value, component, bindValue, component);
        };
      }
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
        ViewModel.setValueFull(value, newContainer, newBindValue, viewmodel);
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
  }, {
    key: 'setInputCheck',
    value: function setInputCheck(viewmodel, bindValue) {
      var valueSetter = ViewModel.setValue(viewmodel, bindValue);
      return function (event) {
        valueSetter(event.target.checked);
      };
    }
  }, {
    key: 'setInputGroup',
    value: function setInputGroup(viewmodel, bindValue) {

      return function (event) {
        var array = ViewModel.getValue(viewmodel, bindValue);
        var elementValue = event.target.value;
        if (event.target.checked) {
          if (!~array.indexOf(elementValue)) {
            array.push(elementValue);
          }
        } else {
          array.remove(elementValue);
        }
      };
    }
  }, {
    key: 'getClass',
    value: function getClass(component, initialClass, bindText) {
      var cssClass = [initialClass];
      if (bindText.trim()[0] === '{') {
        var cssObj = ViewModel.parseBind(bindText);
        for (var key in cssObj) {
          var value = cssObj[key];
          if (ViewModel.getValue(component, value)) {
            cssClass.push(key);
          }
        }
      } else {
        cssClass.push(ViewModel.getValue(component, bindText));
      }
      return cssClass.join(' ');
    }
  }, {
    key: 'getStyle',
    value: function getStyle(component, initialStyle, bindText) {
      var initialStyles = void 0;
      if (!!initialStyle) {
        initialStyles = ViewModel.parseBind(initialStyle.split(";").join(","));
      }

      var objectStyles = void 0;
      if (bindText.trim()[0] === '{') {
        objectStyles = {};
        var preObjectStyles = ViewModel.parseBind(bindText);
        for (var key in preObjectStyles) {
          var value = preObjectStyles[key];
          objectStyles[key] = ViewModel.getValue(component, value);
        }
      } else {
        var vmValue = ViewModel.getValue(component, bindText);
        var newValue = vmValue.split(";").join(",");
        objectStyles = ViewModel.parseBind(newValue);
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
      var component = arguments.length <= 2 || arguments[2] === undefined ? container : arguments[2];

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
              container[key] = ViewModel.prop(value, container);
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
            component.setState({});
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

        this.parent = this.props.parent;
        if (this.parent) this.parent.children().push(this);

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = component.vmCreated[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var fun = _step.value;

            fun.call(component);
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

        this.load(this.props);
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = component.vmAutorun[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var autorun = _step2.value;

            (function (autorun) {
              var fun = function fun(c) {
                autorun.call(component, c);
              };
              component.vmComputations.push(ViewModel.Tracker.autorun(fun));
            })(autorun);
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
      component.componentDidMount = function () {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = component.vmRendered[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
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

        if (old) old.call(component);
      };
    }
  }, {
    key: 'prepareComponentWillUnmount',
    value: function prepareComponentWillUnmount(component) {
      var old = component.componentWillUnmount;
      component.componentWillUnmount = function () {
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = component.vmDestroyed[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var fun = _step4.value;

            fun.call(component);
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

        this.vmComputations.forEach(function (c) {
          return c.stop();
        });
        this.vmRenderComputation.stop();
        if (old) old.call(component);
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
          return !!component.vmChanged;
        };
      }
    }
  }, {
    key: 'prepareMethodsAndProperties',
    value: function prepareMethodsAndProperties(component, initial) {
      for (var prop in initial) {
        if (ViewModel.reactKeyword[prop]) continue;
        if (typeof initial[prop] === 'function') {
          component[prop] = initial[prop].bind(component);
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
        component.vmChanged = true;
        component.setState({});
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
    key: 'prepareValidations',
    value: function prepareValidations(component) {

      component.valid = function () {
        var fields = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

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
        var fields = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

        var messages = [];
        for (var prop in component) {
          if (component[prop] && component[prop].vmPropId && (fields.length === 0 || ~fields.indexOf(prop))) {
            if (component[prop].valid(true)) {
              var message = component[prop].message();
              if (message) {
                messages.push(message);
              }
            }
          }
        }
        return messages;
      };

      component.invalid = function () {
        var fields = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

        return !component.valid(fields);
      };

      component.invalidMessages = function () {
        var fields = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

        var messages = [];
        for (var prop in component) {
          if (component[prop] && component[prop].vmPropId && (fields.length === 0 || ~fields.indexOf(prop))) {
            if (!component[prop].valid(true)) {
              var message = component[prop].message();
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
    key: 'loadMixinShare',
    value: function loadMixinShare(toLoad, collection, component) {
      if (!toLoad) return;
      if (toLoad instanceof Array) {
        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          for (var _iterator5 = toLoad[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var element = _step5.value;

            if (_helper2.default.isString(element)) {
              component.load(collection[element]);
            } else {
              ViewModel.loadMixinShare(element, collection, component);
            }
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
      } else if (_helper2.default.isString(toLoad)) {
        component.load(collection[toLoad]);
      } else {
        for (var ref in toLoad) {
          var container = {};
          var mixshare = toLoad[ref];
          if (mixshare instanceof Array) {
            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
              for (var _iterator6 = mixshare[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                var item = _step6.value;

                ViewModel.load(collection[item], container, component);
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
          } else {
            ViewModel.load(collection[mixshare], container, component);
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

        // Shared
        ViewModel.loadMixinShare(toLoad.share, ViewModel.shared, component);

        // Mixins
        ViewModel.loadMixinShare(toLoad.mixin, ViewModel.mixins, component);

        // Whatever is in 'load' is loaded before direct properties
        component.load(toLoad.load);

        // Load the object into the component
        // (direct properties)
        ViewModel.load(toLoad, component);

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
            for (var item in toLoad[hook]) {
              component[vmProp].push(item);
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

      ViewModel.add(component);

      ViewModel.prepareLoad(component);
      var _iteratorNormalCompletion7 = true;
      var _didIteratorError7 = false;
      var _iteratorError7 = undefined;

      try {
        for (var _iterator7 = ViewModel.globals[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          var global = _step7.value;

          component.load(global);
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

      component.load(initial);

      ViewModel.prepareChildren(component);
      ViewModel.prepareMethodsAndProperties(component, initial);
      ViewModel.prepareComponentWillMount(component);
      ViewModel.prepareComponentDidMount(component);
      ViewModel.prepareComponentDidUpdate(component);
      ViewModel.prepareComponentWillUnmount(component);
      ViewModel.prepareShouldComponentUpdate(component);
      ViewModel.prepareValidations(component);
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
    value: function bindElement(component, bindingText) {
      return function (element) {
        if (!element || element.vmBound) return;
        element.vmBound = true;

        var bindId = ViewModel.nextId();
        var bindObject = ViewModel.parseBind(bindingText);
        for (var bindName in bindObject) {
          if (ViewModel.compiledBindings[bindName]) continue;
          var bindValue = bindObject[bindName];
          if (~bindName.indexOf(' ')) {
            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
              for (var _iterator8 = bindName.split(' ')[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                var bindNameSingle = _step8.value;

                ViewModel.bindSingle(component, bindObject, element, bindNameSingle, bindId);
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
            ViewModel.bindSingle(component, bindObject, element, bindName, bindId);
          }
        }
      };
    }
  }, {
    key: 'bindSingle',
    value: function bindSingle(component, bindObject, element, bindName, bindId) {
      var bindArg = ViewModel.getBindArgument(component, bindObject, element, bindName, bindId);
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
            var _iteratorNormalCompletion9 = true;
            var _didIteratorError9 = false;
            var _iteratorError9 = undefined;

            try {
              for (var _iterator9 = eventName.split(' ')[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                var event = _step9.value;

                func(event, eventFunc);
              }
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
          } else {
            func(eventName, eventFunc);
          }
        }
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
    value: function getBindArgument(component, bindObject, element, bindName, bindId) {
      var getDelayedSetter = function getDelayedSetter(bindArg, setter) {
        if (bindArg.elementBind.throttle) {
          return function () {
            for (var _len2 = arguments.length, args = Array(_len2), _key = 0; _key < _len2; _key++) {
              args[_key] = arguments[_key];
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
          component.vmAutorun.push(ViewModel.Tracker.autorun(fun));
        },
        component: component,
        element: element,
        elementBind: bindObject,
        bindName: bindName,
        bindValue: bindObject[bindName],
        getVmValue: ViewModel.getVmValueGetter(component, bindObject[bindName])
      };
      bindArg.setVmValue = getDelayedSetter(bindArg, ViewModel.getVmValueSetter(component, bindObject[bindName]));
      return bindArg;
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
  ref: 1,
  load: 1,
  onRendered: 1,
  onCreated: 1,
  onDestroyed: 1
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
  templateInstance: 1,
  parent: 1,
  children: 1,
  child: 1,
  reset: 1,
  data: 1
};

ViewModel.reactKeyword = {
  render: 1,
  constructor: 1,
  // getInitialState: 1,
  // getDefaultProps: 1,
  // propTypes: 1,
  // mixins : 1,
  // statics : 1,
  // displayName : 1,
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
  validating: 1,
  message: 1
};

ViewModel.compiledBindings = {
  text: 1,
  html: 1,
  'class': 1,
  'if': 1,
  'style': 1
};

ViewModel.globals = [];
ViewModel.components = {};
ViewModel.mixins = {};
ViewModel.shared = {};
ViewModel.bindings = {};

Object.defineProperties(ViewModel, {
  "property": { get: function get() {
      return new _viewmodelProperty2.default();
    } }
});

ViewModel.Property = _viewmodelProperty2.default;

var _iteratorNormalCompletion10 = true;
var _didIteratorError10 = false;
var _iteratorError10 = undefined;

try {
  for (var _iterator10 = _bindings2.default[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
    var binding = _step10.value;

    ViewModel.addBinding(binding);
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