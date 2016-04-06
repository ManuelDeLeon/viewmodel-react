import Tracker from './tracker';
import H from './helper';
import ReactiveArray from './reactive-array';

export default class ViewModel {
  static nextId() { return H.nextId++;}
  static prop(initial, component) {
    const dependency = new ViewModel.Tracker.Dependency();
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

  // Special thanks to @dino and @faceyspacey for this implementation
  // shamelessly stolen from their TrackerReact project
  static autorunOnce(renderFunc, component) {
    const name = "vmRenderComputation";
    let retValue;
    // Stop it just in case the autorun never re-ran
    if (component[name] && !component[name].stopped) component[name].stop();

    component[name] = ViewModel.Tracker.nonreactive(() => {
      return ViewModel.Tracker.autorun(c => {
        if (c.firstRun) {
          retValue = renderFunc.call(component);
        } else {
          // Stop autorun here so rendering "phase" doesn't have extra work of also stopping autoruns; likely not too
          // important though.
          if (component[name]) component[name].stop();

          component.setState( { vmChanged: 1 });
        }
      });
    });

    return retValue;
  }

  static prepareComponentWillMount(component){
    const old = component.componentWillMount;
    component.componentWillMount = function() {
      this.parent = this.props.parent;
      if (this.parent) this.parent.children().push(this);
      this.load(this.props);
      let oldRender = this.render;
      this.render = () => ViewModel.autorunOnce(oldRender, this);
      if (old) old()
    }
  }

  static prepareComponentWillUnmount(component){
    const old = component.componentWillUnmount;
    component.componentWillUnmount = function() {
      this.vmComputations.forEach(c => c.stop());
      this.vmRenderComputation.stop();
      if (old) old()
    }
  }
  
  static prepareShouldComponentUpdate(component) {
    if (! component.shouldComponentUpdate) {
      component.shouldComponentUpdate = function() {
        return this.state && this.state.vmChanged;
      }
    }
  }

  static prepareMethodsAndProperties(component, initial) {
    for(let prop in initial) {
      if(typeof initial[prop] === 'function') {
        component[prop] = initial[prop].bind(component);
      } else {
        component[prop] = ViewModel.prop(initial[prop], component);
      }
    }
  }

  static prepareChildren(component) {
    const dependency = new ViewModel.Tracker.Dependency();
    const oldChanged = dependency.changed.bind(dependency);
    dependency.changed = function() {
      component.setState({ vmChanged: true });
      oldChanged();
    }
    const array = new ReactiveArray([], dependency);
    const funProp = function(search) {
      array.depend();
      if (arguments.length) {
        const predicate = H.isString(search) ? function(vm) { return vm.vmComponentName === search; } : search;
        return array.filter(predicate);
      } else {
        return array;
      }
    }
    component.children = funProp;
  }

  static prepareComponent(componentName, component, initial) {
    component.vmId = ViewModel.nextId();
    component.vmComponentName = componentName;
    component.vmComputations = [];
    component.vmOnCreated = [];
    component.vmOnRendered = [];
    component.vmOnDestroyed = [];
    component.vmAutorun = [];
    component.load = (obj) => ViewModel.load(obj, component);

    ViewModel.prepareChildren(component);
    ViewModel.prepareMethodsAndProperties(component, initial);
    ViewModel.prepareComponentWillMount(component);
    ViewModel.prepareComponentWillUnmount(component);
    ViewModel.prepareShouldComponentUpdate(component);
  }
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