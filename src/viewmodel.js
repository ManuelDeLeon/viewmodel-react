import Tracker from './tracker';
import H from './helper';
import ReactiveArray from './reactive-array';
import Property from './viewmodel-property';
import parseBind from './parseBind';
import presetBindings from './bindings'
import { getSaveUrl, getLoadUrl } from './viewmodel-onUrl';
const ReactDOM = navigator.project === 'ReactNative' ? null : require('react-dom');

let savedOnUrl = [];

export default class ViewModel {
  static nextId() {
    return H.nextId++;
  }

  static global(obj) {
    ViewModel.globals.push(obj);
  }

  static prepareRoot() {
    if (!ViewModel.rootComponents) {
      const dep = new ViewModel.Tracker.Dependency();
      ViewModel.rootComponents = new ReactiveArray(dep);
    }
  }

  static add(component) {
    const name = component.vmComponentName;
    if (!ViewModel.components[name]) {
      ViewModel.components[name] = {};
    }
    ViewModel.components[name][component.vmId] = component;
    if (!component.parent()) {
      ViewModel.prepareRoot();
      ViewModel.rootComponents.push(component);
    }
  }

  static find(nameOrPredicate, predicateOrNothing, onlyOne = false) {
    const name = H.isString(nameOrPredicate) && nameOrPredicate;
    const predicate =
      (H.isFunction(predicateOrNothing) && predicateOrNothing)
      || (H.isFunction(nameOrPredicate) && nameOrPredicate);
    let collection;
    if (name) {
      if (ViewModel.components[name])
        collection = {all: ViewModel.components[name]}
    } else {
      collection = ViewModel.components
    }
    ;
    if (!collection) return [];
    const result = [];
    for (let groupName in collection) {
      let group = collection[groupName];
      for (let item in group) {
        if (!predicate || predicate(group[item])) {
          result.push(group[item]);
          if (onlyOne) return result;
        }
      }
    }
    return result;
  }

  static findOne(nameOrPredicate, predicateOrNothing) {
    const results = ViewModel.find(nameOrPredicate, predicateOrNothing, true);
    if (results.length) {
      return results[0];
    }
  }

  static mixin(obj) {
    for (let key in obj) {
      ViewModel.mixins[key] = obj[key];
    }
  }

  static signal(obj) {
    for (let key in obj) {
      ViewModel.signals[key] = obj[key];
    }
  }

  static share(obj) {
    for (let key in obj) {
      ViewModel.shared[key] = {}
      let value = obj[key];
      for (let prop in value) {
        let content = value[prop];
        if (H.isFunction(content) || ViewModel.properties[prop]) {
          ViewModel.shared[key][prop] = content;
        } else {
          ViewModel.shared[key][prop] = ViewModel.prop(content);
        }
      }
    }
  }

  static prop(initial, component) {
    const dependency = new ViewModel.Tracker.Dependency();
    const oldChanged = dependency.changed.bind(dependency);
    const components = {};
    if (component && !components[component.vmId]) components[component.vmId] = component;
    dependency.changed = function () {
      for (let key in components) {
        let c = components[key];
        c.vmChange();
      }
      oldChanged();
    }

    const initialValue = initial instanceof ViewModel.Property ? initial.defaultValue : initial;
    let _value = undefined;
    const reset = function () {
      if (initialValue instanceof Array) {
        _value = new ReactiveArray(initialValue, dependency);
      } else {
        _value = initialValue;
      }
    }

    reset();

    const validator = initial instanceof ViewModel.Property ? initial : ViewModel.Property.validator(initial);

    const changeValue = function (value) {
      if (validator.beforeUpdates.length) {
        validator.beforeValueUpdate(value, component);
      }

      if (value instanceof Array) {
        _value = new ReactiveArray(value, dependency);
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

    const funProp = function (value) {
      if (arguments.length) {
        if (_value !== value) {
          if (funProp.delay > 0) {
            ViewModel.delay(funProp.delay, funProp.vmPropId, function () {
              changeValue(value)
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
      get() {
        return _value;
      }
    });

    const hasAsync = validator.hasAsync();
    let validationAsync = { count: 0 };

    const getDone = hasAsync ? function (initialValue) {
      validationAsync.count++;
      return function (result) {
        validationAsync.count--;
        validationAsync.value = initialValue
        validationAsync.result = result;
        dependency.changed();
      };
    } : void 0;

    funProp.valid = function (noAsync) {
      dependency.depend();
      const validSync = validator.verify(_value, component);
      if (!validSync || noAsync || !hasAsync) {
        if (!validSync) {
          return false;
        } else if (hasAsync && validationAsync.value === _value) {
          return validationAsync.result;
        } else {
          return true;
        }
        return validSync;
      } else {
        if (validationAsync.value === _value) {
          return validationAsync.result;
        } else {
          validator.verifyAsync(_value, getDone(_value), component);
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
        return validator.invalidMessageValue;
      }
    };

    return funProp;
  };

  static getValueRef(container, prop) {
    return function (element) {
      container.vmComputations.push(
        ViewModel.Tracker.autorun(function () {
          let value = container[prop]();
          value = value == null ? "" : value;
          if (element && value != element.value) {
            element.value = value;
          }
        })
      )
    }
  }

  static getValue(container, repeatObject, repeatIndex, bindValue, viewmodel, funPropReserved) {
    let value;
    if (arguments.length < 5) viewmodel = container;
    bindValue = bindValue.trim();
    const ref = H.firstToken(bindValue), token = ref[0], tokenIndex = ref[1];
    if (~tokenIndex) {
      const left = ViewModel.getValue(container, repeatObject, repeatIndex, bindValue.substring(0, tokenIndex), viewmodel);
      const right = ViewModel.getValue(container, repeatObject, repeatIndex, bindValue.substring(tokenIndex + token.length), viewmodel);
      value = H.tokens[token.trim()](left, right);
    } else if (bindValue === "this") {
      value = viewmodel;
    } else if (bindValue === "repeatObject") {
      value = repeatObject;
    } else if (bindValue === "repeatIndex") {
      value = repeatIndex;
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
        const newBindValue = bindValue.substring(dotIndex + 1);
        const newBindValueCheck = newBindValue.endsWith('()') ? newBindValue.substr(0, newBindValue.length - 2) : newBindValue;
        const newContainer = ViewModel.getValue(container, repeatObject, repeatIndex, bindValue.substring(0, dotIndex), viewmodel, ViewModel.funPropReserved[newBindValueCheck]);
        value = ViewModel.getValue(newContainer, repeatObject, repeatIndex, newBindValue, viewmodel );
      } else {
        if (container == null) {
          value = undefined;
        } else {
          let name = bindValue;
          const args = [];
          if (~parenIndexStart) {
            const parsed = ViewModel.parseBind(bindValue);
            name = Object.keys(parsed)[0];
            const second = parsed[name];
            if (second.length > 2) {
              const ref1 = second.substr(1, second.length - 2).split(',');
              for (let j = 0, len = ref1.length; j < len; j++) {
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
          const primitive = H.isPrimitive(name);
          if (container.vmId && !primitive && !container[name]) {
            container[name] = ViewModel.prop('', viewmodel);
          }
          if (!primitive && !((container != null) && ((container[name] != null) || H.isObject(container)))) {
            const errorMsg = "Can't access '" + name + "' of '" + container + "'.";
            console.error(errorMsg);
          } else if (primitive) {
            value = H.getPrimitive(name);
          } else if (!(name in container)){
            return undefined;
          } else {
            if (!funPropReserved && H.isFunction(container[name])) {
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
  };
  
  static getVmValueGetter(component, repeatObject, repeatIndex, bindValue) {
    return function(optBindValue = bindValue){
      return ViewModel.getValue(component, repeatObject, repeatIndex, optBindValue.toString(), component)
    }
  }
  
  static getVmValueSetter(component, repeatObject, repeatIndex, bindValue) {
    if (!H.isString(bindValue)){
      return function() {}  
    }
    if (~bindValue.indexOf(')', bindValue.length - 1)){
      return function(){
        return ViewModel.getValue(component, repeatObject, repeatIndex, bindValue);
      }
    } else {
      return function(value) {
        ViewModel.setValueFull(value, repeatObject, repeatIndex, component, bindValue, component);
      }
    }
  }

  static setValueFull(value, repeatObject, repeatIndex, container, bindValue, viewmodel) {
    var i, newBindValue, newContainer;
    if (H.dotRegex.test(bindValue)) {
      i = bindValue.search(H.dotRegex);
      if (bindValue.charAt(i) !== '.') {
        i += 1;
      }
      newContainer = ViewModel.getValue(container, repeatObject, repeatIndex, bindValue.substring(0, i), viewmodel);
      newBindValue = bindValue.substring(i + 1);
      ViewModel.setValueFull(value, repeatObject, repeatIndex, newContainer, newBindValue, viewmodel);
    } else {
      if (H.isFunction(container[bindValue])) {
        container[bindValue](value);
      } else {
        container[bindValue] = value;
      }
    }
  };

  static setValue(viewmodel, repeatObject, repeatIndex, bindValue) {
    if (!H.isString(bindValue)) {
      return (function() {});
    }
    if (~bindValue.indexOf(')', bindValue.length - 1)) {
      return function() {
        return ViewModel.getValue(viewmodel, repeatObject, repeatIndex, bindValue, viewmodel);
      };
    } else {
      return function(value) {
        return ViewModel.setValueFull(value, repeatObject, repeatIndex, viewmodel, bindValue, viewmodel);
      };
    }
  };

  static getClass(component, repeatObject, repeatIndex, initialClass, bindText) {
    const cssClass = [initialClass];
    if (bindText.trim()[0] === '{') {
      const cssObj = ViewModel.parseBind(bindText);
      for(let key in cssObj) {
        let value = cssObj[key];
        if (ViewModel.getValue(component, repeatObject, repeatIndex, value)) {
          cssClass.push( key );
        }
      }
    } else {
      cssClass.push( ViewModel.getValue(component, repeatObject, repeatIndex, bindText) );
    }
    return cssClass.join(' ');
  };

  static getDisabled(component, repeatObject, repeatIndex, isEnabled, bindText) {
    const value = ViewModel.getValue(component, repeatObject, repeatIndex, bindText);
    return !!(isEnabled ? !value : value);
  };

  static getStyle(component, repeatObject, repeatIndex, initialStyle, bindText) {
    let initialStyles; 
    if (!!initialStyle) {
      initialStyles = ViewModel.parseBind(initialStyle.split(";").join(","));
    }

    let objectStyles;
    if (bindText.trim()[0] === '[') {
      objectStyles = {};
      const itemsString = bindText.substr(1, bindText.length - 2);
      const items = itemsString.split(',');
      for(let item of items) {
        const vmValue = ViewModel.getValue(component, repeatObject, repeatIndex, item);
        let bag = H.isString(vmValue) ? ViewModel.parseBind(vmValue) : vmValue;
        for (let key in bag) {
          const value = bag[key];
          objectStyles[key] = value;
        }
      }
    } else if (bindText.trim()[0] === '{') {
      objectStyles = {};
      const preObjectStyles = ViewModel.parseBind(bindText);
      for (let key in preObjectStyles) {
        let value = preObjectStyles[key];
        objectStyles[key] = ViewModel.getValue(component, repeatObject, repeatIndex, value);
      }
    } else {
      const vmValue = ViewModel.getValue(component, repeatObject, repeatIndex, bindText)
      if (H.isString(vmValue)) {
        const newValue = vmValue.split(";").join(",");
        objectStyles = ViewModel.parseBind(newValue);
      } else {
        objectStyles = vmValue;
      }

    }

    const styles = {};
    H.addStyles(styles, initialStyles);
    H.addStyles(styles, objectStyles);
    return styles;
  };

  static parseBind(str) {
    return parseBind(str);
  }

  static load(toLoad, container, component = container) {
    const loadObj = function(obj) {
      for (let key in obj) {
        const value = obj[key];
        if (!(ViewModel.properties[key] || ViewModel.reserved[key])) {
          if (H.isFunction(value)) {
            container[key] = value;
            if (value.vmPropId) {
              container[key].addComponent(component);
            }
          } else if (container[key] && container[key].vmPropId && H.isFunction(container[key])) {
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
          component.vmChange();
        }
      });
    });
    return retValue;
  }

  static prepareComponentWillMount(component){
    const old = component.componentWillMount;
    component.componentWillMount = function() {
      let parent = this.props['data-vm-parent'];
      if (parent && parent.children) {
        parent.children().push(this);
      }
      this.parent = function() {
        parent = this.props['data-vm-parent']
        if (parent && parent.vmId) {
          this.vmDependsOnParent = true;
          return parent;
        } else {
          return undefined;
        }

      };
      this.load(this.props);

      for(let fun of component.vmCreated){
        fun.call(component)
      }

      let oldRender = this.render;
      this.render = () => ViewModel.autorunOnce(oldRender, this);
      if (old) old.call(component)
    }
  }

  static prepareComponentDidMount(component){
    const old = component.componentDidMount;
    component.componentDidMount = function() {
      component.vmMounted = true;
      for(let fun of component.vmRendered){
        fun.call(component)
      }
      for(let autorun of component.vmAutorun) {
        component.vmComputations.push( ViewModel.Tracker.autorun(function(c) {
          autorun.call(component, c);
        }));
      }

      if (old) old.call(component);

      component.vmPathToRoot = ViewModel.getPathToRoot(component);
      component.vmPathToParent = ViewModel.getPathToParent(component);

      if (component.onUrl) {
        const saveOnUrl = function(component) {
          return function() {
            ViewModel.loadUrl(component);
            ViewModel.saveUrl(component);
          }

        };
        const toSave = saveOnUrl(component);
        if(savedOnUrl) {
          savedOnUrl.push(toSave);
        } else {
          toSave();
        }
      }

      if (savedOnUrl && !component.parent()) {
        savedOnUrl.forEach(function(fun) { fun(); });
        savedOnUrl = null;
      }

      ViewModel.add(component);

      component.vmChanged = false;
    }
  }

  static prepareComponentWillUnmount(component){
    const old = component.componentWillUnmount;
    component.componentWillUnmount = function() {

      for(let fun of component.vmDestroyed){
        fun.call(component)
      }
      this.vmComputations.forEach(c => c.stop());
      this.vmRenderComputation.stop();
      delete ViewModel.components[component.vmComponentName][component.vmId];
      if (!component.parent()) {
        for(var i = ViewModel.rootComponents.length - 1; i >= 0; i--) {
          if(ViewModel.rootComponents[i].vmId === component.vmId) {
            ViewModel.rootComponents.splice(i, 1);
            break;
          }
        }
      }

      if (old) old.call(component)
      component.vmMounted = false;
    }
  }

  static prepareComponentDidUpdate(component){
    const old = component.componentDidUpdate;
    component.componentDidUpdate = function() {
      component.vmChanged = false;
      if (old) old.call(component)
    }
  }
  
  static prepareShouldComponentUpdate(component) {
    if (! component.shouldComponentUpdate) {
      component.shouldComponentUpdate = function() {
        const parent = component.parent();
        if (component.vmChanged || ( component.vmDependsOnParent && parent.vmChanged )) {

          if(parent && !parent.vmChanged && !component.hasOwnProperty('vmUpdateParent')) {
            for(let ref in parent.refs) {
              if (parent.refs[ref] === component ){
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
      }
    }
  }

  static prepareComponentWillReceiveProps(component) {
    const old = component.componentWillReceiveProps;
    component.componentWillReceiveProps = function(props) {
      this.load(props);
      if (old) old.call(component)
    }
  }

  static prepareMethodsAndProperties(component, initial) {
    for(let prop in initial) {
      if (ViewModel.reactKeyword[prop]) continue;
      if(typeof initial[prop] === 'function') {
        component[prop] = initial[prop].bind(component);
        component[prop].vmIsFunc = true;
      } else {
        component[prop] = ViewModel.prop(initial[prop], component);
      }
    }
  }

  static prepareChildren(component) {
    const dependency = new ViewModel.Tracker.Dependency();
    const oldChanged = dependency.changed.bind(dependency);
    dependency.changed = function() {
      component.vmChange();
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

  static prepareData(component) {

    component.data = function (fields = []) {
      const js ={};
      for (let prop in component) {
        if (component[prop] && component[prop].vmPropId && (fields.length === 0 || ~fields.indexOf(prop))) {
          component[prop].depend();
          let value = component[prop].value;
          if (value instanceof Array) {
            js[prop] = value.array();
          } else {
            js[prop] = value;
          }
        }
      }
      return js;
    }
  }

  static prepareValidations(component) {

    component.valid = function(fields = []) {
      for(let prop in component){
        if(component[prop] && component[prop].vmPropId && (fields.length === 0 || ~fields.indexOf(prop))) {
          if(!component[prop].valid(true)){
            return false;
          }
        }
      }
      return true;
    }

    component.validMessages = function(fields = []) {
      const messages = [];
      for(let prop in component){
        if(component[prop] && component[prop].vmPropId && (fields.length === 0 || ~fields.indexOf(prop))) {
          if(component[prop].valid(true)){
            let message = component[prop].message();
            if (message) {
              messages.push(message);
            }
          }
        }
      }
      return messages;
    }

    component.invalid = function(fields = []) {
      return !component.valid(fields);
    }

    component.invalidMessages = function(fields = []) {
      const messages = [];
      for(let prop in component){
        if(component[prop] && component[prop].vmPropId && (fields.length === 0 || ~fields.indexOf(prop))) {
          if(!component[prop].valid(true)){
            let message = component[prop].message();
            if (message) {
              messages.push(message);
            }
          }
        }
      }
      return messages;
    }
  }

  static prepareReset(component) {

    component.reset = function () {
      for (let prop in component) {
        if (component[prop] && component[prop].vmPropId ) {
          component[prop].reset();
        }
      }
    }
  }

  static loadMixinShare(toLoad, collection, component, bag) {
    if (! toLoad) return;
    if (toLoad instanceof Array) {
      for(let element of toLoad) {
        if (H.isString(element)) {
          component.load( collection[element] );
          bag[element] = null;
        } else {
          ViewModel.loadMixinShare( element, collection, component, bag );
        }
      }
    } else if (H.isString(toLoad)) {
      component.load( collection[toLoad] );
      bag[toLoad] = null;
    } else {
      for (let ref in toLoad) {
        const container = {};
        const mixshare = toLoad[ref];
        if ( mixshare instanceof Array ) {
          for(let item of mixshare){
            ViewModel.load( collection[item], container, component );
            bag[item] = ref;
          }
        } else {
          ViewModel.load( collection[mixshare], container, component );
          bag[mixshare] = ref;
        }
        component[ref] = container;
        
      }
    }
  }

  static prepareLoad(component) {
    component.load = function(toLoad) {
      if (! toLoad) return;

      // Signals
      for (let signal of ViewModel.signalsToLoad(toLoad.signal, component)) {
        component.load( signal );
        component.vmCreated.push( signal.onCreated );
        component.vmDestroyed.push( signal.onDestroyed );
      }

      // Shared
      ViewModel.loadMixinShare( toLoad.share, ViewModel.shared, component, component.vmShares );

      // Mixins
      ViewModel.loadMixinShare( toLoad.mixin, ViewModel.mixins, component, component.vmMixins );

      // Whatever is in 'load' is loaded before direct properties
      component.load( toLoad.load )

      // Load the object into the component
      // (direct properties)
      ViewModel.load(toLoad, component)

      const hooks = {
        created: 'vmCreated',
        rendered: 'vmRendered',
        destroyed: 'vmDestroyed',
        autorun: 'vmAutorun'
      }

      for(let hook in hooks){
        if (!toLoad[hook]) continue;
        let vmProp = hooks[hook];
        if (toLoad[hook] instanceof Array) {
          for(let item of toLoad[hook]) {
            component[vmProp].push(item)
          }
        } else {
          component[vmProp].push(toLoad[hook])
        }
      }
    }
  }

  static prepareComponent(componentName, component, initial) {
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
    const getHasComposition = function(bag) {
      return function(name, prop) {
        return bag.hasOwnProperty(name) && (!bag[name] || bag[name] === prop );
      };
    };
    component.hasMixin = getHasComposition(component.vmMixins);
    component.hasShare = getHasComposition(component.vmShares);
    component.hasSignal = getHasComposition(component.vmSignals);

    component.vmChange = function() {
      if (!component.vmChanged) {
        component.vmChanged = true;
        if (component.vmMounted) {
          component.setState({});
        }
      }
    }

    ViewModel.prepareLoad(component);
    for(let global of ViewModel.globals) {
      component.load(global);
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

  static addBinding(binding) {
    if (!binding.priority) binding.priority = 1;
    if (binding.selector) binding.priority += 1;
    if (binding.bindIf) binding.priority += 1;
    if (!ViewModel.bindings[binding.name]) {
      ViewModel.bindings[binding.name] = [];
    }
    ViewModel.bindings[binding.name].push(binding);
  }
  
  static bindElement(component, repeatObject, repeatIndex, bindingText) {
    return function(element) {
      if (!element || element.vmBound) return;
      element.vmBound = true;

      const bindId = ViewModel.nextId();
      const bindObject = ViewModel.parseBind(bindingText);
      for (let bindName in bindObject) {
        if (ViewModel.compiledBindings[bindName]) continue;
        let bindValue = bindObject[bindName];
        if (~bindName.indexOf(' ')) {
          for (let bindNameSingle of bindName.split(' ')) {
            ViewModel.bindSingle(component, repeatObject, repeatIndex, bindObject, element, bindNameSingle, bindId);
          }
        } else {
          ViewModel.bindSingle(component, repeatObject, repeatIndex, bindObject, element, bindName, bindId);
        }
      }
    }
  }

  static bindSingle(component, repeatObject, repeatIndex, bindObject, element, bindName, bindId){
    const bindArg = ViewModel.getBindArgument(component, repeatObject, repeatIndex, bindObject, element, bindName, bindId);
    const binding = ViewModel.getBinding(bindName, bindArg);
    if (!binding) return;

    if (binding.bind) {
      binding.bind(bindArg);
    }
    if (binding.autorun){
      bindArg.autorun( binding.autorun );
    }

    if (binding.events){
      let func = function(eventName, eventFunc) {
        const eventListener = function (event) {
          eventFunc(bindArg, event)
        }

        bindArg.element.addEventListener(eventName, eventListener);
        bindArg.component.vmDestroyed.push(() => {
          bindArg.element.removeEventListener(eventName, eventListener)
        });
      }
      for (let eventName in binding.events) {
        let eventFunc = binding.events[eventName];
        if (~eventName.indexOf(' ')) {
          for(let event of eventName.split(' ')){
            func(event, eventFunc);
          }
        } else {
          func(eventName, eventFunc);
        }

      }
    }

  }

  static getComponentPath(component) {
    let path = component.vmComponentName;
    const parent = component.parent();
    if (parent) {
      path = ViewModel.getComponentPath(parent) + component.vmPathToParent + '/' + path ;
    } else {
      path = component.vmPathToParent + '/' + path ;
    }

    return path;
  }

  static getPathToRoot(component) {
    if (!ReactDOM) return '/';
    var difference, i, parentPath, viewmodelPath;
    return ViewModel.getElementPath(ReactDOM.findDOMNode(component));
  };

  static getPathToParent(component) {
    var difference, i, parentPath, viewmodelPath;
    const parent = component.parent();
    if (!parent) {
      return '/';
    }
    viewmodelPath = component.vmPathToRoot;
    if (!parent.vmPathToRoot) {
      parent.vmPathToRoot = ViewModel.getPathToRoot(parent);
    }
    parentPath = component.parent().vmPathToRoot;

    i = 0;
    while (parentPath[i] === viewmodelPath[i] && (parentPath[i] != null)) {
      i++;
    }
    difference = viewmodelPath.substr(i);
    return difference;
  };

  static getElementPath(element) {
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
  };
  
  static getBinding(bindName, bindArg) {
    let binding = null;
    let bindingArray = ViewModel.bindings[bindName];
    if (bindingArray) {
      if (bindingArray.length === 1 && !(bindingArray[0].bindIf || bindingArray[0].selector)) {
        binding = bindingArray[0];
      } else {
        binding = bindingArray
          .sort(function(a,b) { b.priority - a.priority })
          .find(function(b){
            return !( (b.bindIf && !b.bindIf(bindArg)) || (b.selector && !H.elementMatch(bindArg.element, b.selector)) );
          });
      }
    }
    return binding || ViewModel.getBinding('default', bindArg);
  }

  static getBindArgument(component, repeatObject, repeatIndex, bindObject, element, bindName, bindId){
    const getDelayedSetter = function(bindArg, setter) {
      if (bindArg.elementBind.throttle) {
        return function(...args) {
          ViewModel.delay( bindArg.getVmValue(bindArg.elementBind.throttle), bindId, function(){ setter(...args) } );
        }
      } else {
        return setter;
      }
    }
    const bindArg = {
      autorun: function(f){
        let fun = function(c) { f(bindArg, c) };
        component.vmComputations.push( ViewModel.Tracker.autorun(fun) );
      },
      component: component,
      element: element,
      elementBind: bindObject,
      bindName: bindName,
      bindValue: bindObject[bindName],
      getVmValue: ViewModel.getVmValueGetter(component, repeatObject, repeatIndex, bindObject[bindName])
    }
    bindArg.setVmValue = getDelayedSetter( bindArg, ViewModel.getVmValueSetter(component, repeatObject, repeatIndex, bindObject[bindName]) );
    return bindArg;
  }

  static throttle(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
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
  static signalContainer(containerName, container) {
    const all = [];
    if (containerName) {
      const signalObject = ViewModel.signals[containerName];
      for(let key in signalObject) {
        let value = signalObject[key];
        (
          function(key, value) {
            const single = {};
            single[key] = {};
            const transform = value.transform || function(e){ return e; };
            const boundProp = `_${key}_Bound`;
            single.onCreated = function() {
              const vmProp = container[key];
              const func = function(e) {
                vmProp(transform(e));
              };
              const funcToUse = value.throttle ? ViewModel.throttle(func, value.throttle) : func;
              container[boundProp] = funcToUse;
              value.target.addEventListener(value.event, this[boundProp]);
              var event = document.createEvent('HTMLEvents');
              event.initEvent(value.event, true, false);
              value.target.dispatchEvent(event);
            }
            single.onDestroyed = function() {
              value.target.removeEventListener( value.event, this[boundProp] );
            }
            all.push(single);
          }
        )(key, value);
      }
    }
    return all;
  }

  static signalsToLoad(containerName, container) {
    if (containerName instanceof Array) {
      const signals = [];
      for(let name of containerName) {
        for(let signal of ViewModel.signalContainer(name, container)) {
          signals.push(signal);
        }
      }
      return signals;
    } else {
      return ViewModel.signalContainer(containerName, container);
    }
  }

  static loadComponent(comp) {
    const vm = {};
    ViewModel.prepareComponent( 'TestComponent', vm, null);
    vm.load(comp);
    vm.reset();
    return vm;
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
  rendered: 1,
  created: 1,
  destroyed: 1
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
  componentWillReceiveProps : 1,
  shouldComponentUpdate : 1,
  componentWillUpdate : 1,
  componentDidUpdate : 1,
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
  'style': 1,
  repeat: 1,
  key: 1
}

ViewModel.globals = [];
ViewModel.components = {};
ViewModel.mixins = {};
ViewModel.shared = {};
ViewModel.signals = {};
ViewModel.bindings = {};

Object.defineProperties(ViewModel, {
  "property": { get: function () { return new Property; } }
});

ViewModel.Property = Property;
ViewModel.saveUrl = getSaveUrl(ViewModel);
ViewModel.loadUrl = getLoadUrl(ViewModel);

for(let binding of presetBindings) {
  ViewModel.addBinding(binding);
}

const delayed = {};

ViewModel.delay = function(time, nameOrFunc, fn) {
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