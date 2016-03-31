import Tracker from './tracker';
import H from './helper';
import ReactiveArray from './reactive-array';

export default class ViewModel {
  static nextId() { return H.nextId++;}
  static prop(initial, component) {
    const dependency = new Tracker.Dependency();
    const oldChanged = dependency.changed.bind(dependency);
    dependency.changed = function() {
      component.setState({ vmChanged: true });
      oldChanged();
    }
    
    const initialValue = H.isArray(initial) ? new ReactiveArray(initial, dependency) : initial;
    let _value = initialValue;
    const changeValue = function(value) {
      if (value instanceof Array) {
        _value = new ReactiveArray(value, dependency);
      } else {
        _value = value;
      }
      return dependency.changed();
    };
    const funProp = function(value) {
      if (arguments.length) {
        if (_value !== value) {
          if (funProp.delay > 0) {
            ViewModel.delay(funProp.delay, funProp.vmProp, function() { changeValue(value) });
          } else {
            changeValue(value);
          }
        }
      } else {
        dependency.depend();
      }
      return _value;
    };
    funProp.reset = function() {
      if (_value instanceof ReactiveArray) {
        _value = new ReactiveArray(initial, dependency);
      } else {
        _value = initialValue;
      }
      dependency.changed();
    };
    funProp.depend = function() {
      dependency.depend();
    };
    funProp.changed = function() {
      dependency.changed();
    };
    funProp.delay = 0;
    funProp.vmProp = ViewModel.nextId();
    Object.defineProperty(funProp, 'value', {
      get() {
        return _value;
      }
    });
    return funProp;
  };

  static getValue(container, bindValue, viewmodel) {
    let value;
    if (arguments.length < 3) viewmodel = container;
    bindValue = bindValue.trim();
    const ref = H.firstToken(bindValue), token = ref[0], tokenIndex = ref[1];
    if (~tokenIndex) {
      const left = ViewModel.getValue(container, bindValue.substring(0, tokenIndex), viewmodel);
      const right = ViewModel.getValue(container, bindValue.substring(tokenIndex + token.length), viewmodel);
      value = H.tokens[token.trim()](left, right);
    } else if (bindValue === "this") {
      value = viewmodel;
    } else if (H.isQuoted(bindValue)) {
      value = H.removeQuotes(bindValue);
    } else {
      const negate = bindValue.charAt(0) === '!';
      if (negate) {
        bindValue = bindValue.substring(1);
      }
      let dotIndex = bindValue.search(H.dotRegex);
      if (~dotIndex && bindValue.charAt(dotIndex) !== '.') {
        dotIndex += 1;
      }
      const parenIndexStart = bindValue.indexOf('(');
      const parenIndexEnd = H.getMatchingParenIndex(bindValue, parenIndexStart);
      const breakOnFirstDot = ~dotIndex && (!~parenIndexStart || dotIndex < parenIndexStart || dotIndex === (parenIndexEnd + 1));
      if (breakOnFirstDot) {
        const newContainer = ViewModel.getValue(container, bindValue.substring(0, dotIndex), viewmodel);
        const newBindValue = bindValue.substring(dotIndex + 1);
        value = ViewModel.getValue(newContainer, newBindValue, viewmodel);
      } else {
        let name = bindValue;
        const args = [];
        if (~parenIndexStart) {
          const parsed = H.parseBind(bindValue);
          name = Object.keys(parsed)[0];
          const second = parsed[name];
          if (second.length > 2) {
            const ref1 = second.substr(1, second.length - 2).split(',');
            for (j = 0, len = ref1.length; j < len; j++) {
              let arg = ref1[j].trim();
              let newArg;
              if (arg === "this") {
                newArg = viewmodel;
              } else if (H.isQuoted(arg)) {
                newArg = H.removeQuotes(arg);
              } else {
                const neg = arg.charAt(0) === '!';
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
        const primitive = H.isPrimitive(name);
        if (container.vmId && !primitive && !container[name]) {
          container[name] = ViewModel.prop('', viewmodel);
        }
        if (!primitive && !((container != null) && ((container[name] != null) || H.isObject(container)))) {
          const errorMsg = "Can't access '" + name + "' of '" + container + "'.";
          console.error(errorMsg);
        } else if (primitive || !name in container) {
          value = H.getPrimitive(name);
        } else {
          if (H.isFunction(container[name])) {
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

  static setValueFull(value, container, bindValue, viewmodel) {
    var i, newBindValue, newContainer;
    if (H.dotRegex.test(bindValue)) {
      i = bindValue.search(H.dotRegex);
      if (bindValue.charAt(i) !== '.') {
        i += 1;
      }
      newContainer = ViewModel.getValue(container, bindValue.substring(0, i), viewmodel);
      newBindValue = bindValue.substring(i + 1);
      ViewModel.setValueFull(value, newContainer, newBindValue, viewmodel);
    } else {
      if (H.isFunction(container[bindValue])) {
        container[bindValue](value);
      } else {
        container[bindValue] = value;
      }
    }
  };

  static setValue(viewmodel, bindValue) {
    if (!H.isString(bindValue)) {
      return (function() {});
    }
    if (~bindValue.indexOf(')', bindValue.length - 1)) {
      return function() {
        return ViewModel.getValue(viewmodel, bindValue, viewmodel);
      };
    } else {
      return function(value) {
        return ViewModel.setValueFull(value, viewmodel, bindValue, viewmodel);
      };
    }
  };

  static setInputValue(viewmodel, bindValue) {
    var valueSetter = ViewModel.setValue(viewmodel, bindValue);
    return function(event) {
      valueSetter(event.target.value);
    }
  };

  static load(toLoad, viewmodel) {
    ViewModel.loadProperties(toLoad, viewmodel)
  }
  
  static loadProperties(toLoad, container) {
    const loadObj = function(obj) {
      for (let key in obj) {
        const value = obj[key];
        if (!(ViewModel.properties[key] || ViewModel.reserved[key])) {
          if (H.isFunction(value)) {
            container[key] = value;
          } else if (container[key] && container[key].vmProp && H.isFunction(container[key])) {
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
  };
}

ViewModel.Tracker = Tracker;

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