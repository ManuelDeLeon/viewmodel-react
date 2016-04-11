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
      var dependency = new ViewModel.Tracker.Dependency();
      var oldChanged = dependency.changed.bind(dependency);
      dependency.changed = function () {
        component.setState({ vmChanged: true });
        oldChanged();
      };

      var initialValue = _helper2.default.isArray(initial) ? new _reactiveArray2.default(initial, dependency) : initial;
      var _value = initialValue;
      var changeValue = function changeValue(value) {
        if (value instanceof Array) {
          _value = new _reactiveArray2.default(value, dependency);
        } else {
          _value = value;
        }
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
          if (container.vmId && !primitive && !container[name]) {
            container[name] = ViewModel.prop('', viewmodel);
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
    key: 'load',
    value: function load(toLoad, viewmodel) {
      ViewModel.loadProperties(toLoad, viewmodel);
    }
  }, {
    key: 'loadProperties',
    value: function loadProperties(toLoad, container) {
      var loadObj = function loadObj(obj) {
        for (var key in obj) {
          var value = obj[key];
          if (!(ViewModel.properties[key] || ViewModel.reserved[key])) {
            if (_helper2.default.isFunction(value)) {
              container[key] = value;
            } else if (container[key] && container[key].vmProp && _helper2.default.isFunction(container[key])) {
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

      component[name] = ViewModel.Tracker.autorun(function (c) {
        if (c.firstRun) {
          retValue = renderFunc.call(component);
        } else {
          // Stop autorun here so rendering "phase" doesn't have extra work of also stopping autoruns; likely not too
          // important though.
          if (component[name]) component[name].stop();
          component.setState({ vmChanged: true });
        }
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
        this.load(this.props);
        var oldRender = this.render;
        this.render = function () {
          return ViewModel.autorunOnce(oldRender, _this);
        };
        if (old) old.call(component);
      };
    }
  }, {
    key: 'prepareComponentWillUnmount',
    value: function prepareComponentWillUnmount(component) {
      var old = component.componentWillUnmount;
      component.componentWillUnmount = function () {
        this.vmComputations.forEach(function (c) {
          return c.stop();
        });
        this.vmRenderComputation.stop();
        if (old) old.call(component);
      };
    }
  }, {
    key: 'prepareShouldComponentUpdate',
    value: function prepareShouldComponentUpdate(component) {
      if (!component.shouldComponentUpdate) {
        component.shouldComponentUpdate = function () {
          return !!(this.state && this.state.vmChanged);
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
        component.setState({ vmChanged: true });
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
    key: 'prepareComponent',
    value: function prepareComponent(componentName, component, initial) {
      component.vmId = ViewModel.nextId();
      component.vmComponentName = componentName;
      component.vmComputations = [];
      component.vmOnCreated = [];
      component.vmOnRendered = [];
      component.vmOnDestroyed = [];
      component.vmAutorun = [];
      component.load = function (obj) {
        return ViewModel.load(obj, component);
      };

      ViewModel.prepareChildren(component);
      ViewModel.prepareMethodsAndProperties(component, initial);
      ViewModel.prepareComponentWillMount(component);
      ViewModel.prepareComponentWillUnmount(component);
      ViewModel.prepareShouldComponentUpdate(component);
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
  vmProp: 1,
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