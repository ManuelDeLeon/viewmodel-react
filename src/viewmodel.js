import Tracker from './tracker';
import H from './helper';
import ReactiveArray from './reactive-array';
import Property from './viewmodel-property';
import parseBind from './parseBind';
import ReactDOM from 'react-dom';
import presetBindings from './bindings'

export default class ViewModel {
  static nextId() {
    return H.nextId++;
  }

  static global(obj) {
    ViewModel.globals.push(obj);
  }

  static add(component) {
    const name = component.vmComponentName;
    if (!ViewModel.components[name]) {
      ViewModel.components[name] = {};
    }
    ViewModel.components[name][component.vmId] = component;
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
        if (!c.vmChanged) {
          c.vmChanged = true
          c.setState({});
        }
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
        validator.beforeValueUpdate(_value, component);
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
    const validDependency = hasAsync && new Tracker.Dependency();
    const validatingItems = hasAsync && new ReactiveArray([], new ViewModel.Tracker.Dependency());
    let validationAsync = {};

    const getDone = hasAsync ? function (initialValue) {
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
        let retVal = validationAsync.result;
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
  };

  static getValueRef(container, prop) {
    return function (element) {
      container.vmAutorun.push(
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

  static getCheckHook(container, prop, isCheck) {
    var valueSetter = ViewModel.setValue(container, prop);
    return function (element, force) {
      if (!force && (!element || element.vmCheckHook)) return;
      element.vmCheckHook = true;

      const changeListener = function () {
        if (isCheck || element.type === "checkbox") {
          valueSetter(element.checked);
        } else if (element.type === "radio" && element.checked) {
          valueSetter(element.value);
          if (element.name) {
            const inputs = ReactDOM.findDOMNode(container).querySelectorAll(`input[type=radio][name=${element.name}]`);
            const event = new Event('change');
            Array.prototype.forEach.call(inputs, function (input, i) {
              if (input !== element) {
                input.dispatchEvent(event);
              }
            });
          }
        }
      }

      element.addEventListener('change', changeListener);
      container.vmDestroyed.push(() => {
        element.removeEventListener('change', changeListener)
      });

      container.vmAutorun.push(
        ViewModel.Tracker.autorun(() => {

          var value = ViewModel.getValue(container, prop);
          var elementValue = element.type === "checkbox" ? element.checked : element.value;
          if (element) {
            if (value != element.checked) {
              element.checked = (value === elementValue);
            }
          }
        })
      );
    }
  }

  static getGroupHook(container, prop, hasCheck, checkProp) {
    let checkHook = hasCheck && ViewModel.getCheckHook(container, checkProp, true);
    return function(element) {
      if (!element || element.vmGroupHook) return;
      element.vmGroupHook = true;
      if (checkHook){
        checkHook(element);
      }
      if (element.type === "radio") {
        ViewModel.getCheckHook(container, prop)(element, true);
        return;
      }

      const changeListener = function() {
        const array = ViewModel.getValue(container, prop);
        const elementValue = element.value
        if (element.checked) {
          if (!~array.indexOf(elementValue)) {
            array.push(elementValue);
          }
        } else {
          array.remove(elementValue);
        }
      }
      element.addEventListener('change', changeListener);
      container.vmDestroyed.push( () => {
        element.removeEventListener('change', changeListener)
      });

      container.vmAutorun.push(
        ViewModel.Tracker.autorun(function() {
          let array = ViewModel.getValue(container, prop);
          if (!element) return;
          let inArray = !!~array.indexOf(element.value);

          if(element.checked != inArray) {
            element.checked = inArray;
          }
        })
      )
    }
  }

  static getValue(container, bindValue, viewmodel, funPropReserved) {
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
        const newBindValue = bindValue.substring(dotIndex + 1);
        const newBindValueCheck = newBindValue.endsWith('()') ? newBindValue.substr(0, newBindValue.length - 2) : newBindValue;
        const newContainer = ViewModel.getValue( container, bindValue.substring(0, dotIndex), viewmodel, ViewModel.funPropReserved[newBindValueCheck]);
        value = ViewModel.getValue( newContainer, newBindValue, viewmodel );
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
          if (!funPropReserved && H.isFunction(container[name])) {
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
  
  static getVmValueGetter(component, bindValue) {
    return function(optBindValue = bindValue){
      return ViewModel.getValue(component, optBindValue.toString(), component)
    }
  }
  
  static getVmValueSetter(component, bindValue) {
    if (!H.isString(bindValue)){
      return function() {}  
    }
    if (~bindValue.indexOf(')', bindValue.length - 1)){
      return function(){
        return ViewModel.getValue(component, bindValue);
      }
    } else {
      return function(value) {
        ViewModel.setValueFull(value, component, bindValue, component);
      }
    }
  }

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

  static setInputCheck(viewmodel, bindValue) {
    var valueSetter = ViewModel.setValue(viewmodel, bindValue);
    return function(event) {
      valueSetter(event.target.checked);
    }
  };

  static setInputGroup(viewmodel, bindValue) {

    return function(event) {
      const array = ViewModel.getValue(viewmodel, bindValue);
      const elementValue = event.target.value
      if (event.target.checked) {
        if (!~array.indexOf(elementValue)) {
          array.push(elementValue);
        }
      } else {
        array.remove(elementValue);
      }
    }
  };

  static getClass(component, initialClass, bindText) {
    const cssClass = [initialClass];
    if (bindText.trim()[0] === '{') {
      const cssObj = ViewModel.parseBind(bindText);
      for(let key in cssObj) {
        let value = cssObj[key];
        if (ViewModel.getValue(component, value)) {
          cssClass.push( key );
        }
      }
    } else {
      cssClass.push( ViewModel.getValue(component, bindText) );
    }
    return cssClass.join(' ');
  };

  static getStyle(component, initialStyle, bindText) {
    let initialStyles; 
    if (!!initialStyle) {
      initialStyles = ViewModel.parseBind(initialStyle.split(";").join(","));
    }

    let objectStyles;
    if (bindText.trim()[0] === '{') {
      objectStyles = {};
      const preObjectStyles = ViewModel.parseBind(bindText);
      for (let key in preObjectStyles) {
        let value = preObjectStyles[key];
        objectStyles[key] = ViewModel.getValue(component, value);
      }
    } else {
      const vmValue = ViewModel.getValue(component, bindText)
      const newValue = vmValue.split(";").join(",");
      objectStyles = ViewModel.parseBind(newValue);
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
          component.setState({});
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

      for(let fun of component.vmCreated){
        fun.call(component)
      }
      this.load(this.props);
      for(let autorun of component.vmAutorun) {
        (
          function(autorun){
            const fun = function(c) {
              autorun.call(component, c);
            }
            component.vmComputations.push( ViewModel.Tracker.autorun(fun) );
          }
        )(autorun);
      }
      let oldRender = this.render;
      this.render = () => ViewModel.autorunOnce(oldRender, this);
      if (old) old.call(component)
    }
  }

  static prepareComponentDidMount(component){
    const old = component.componentDidMount;
    component.componentDidMount = function() {
      for(let fun of component.vmRendered){
        fun.call(component)
      }
      if (old) old.call(component)
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
      if (old) old.call(component)
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
        return !!component.vmChanged;
      }
    }
  }

  static prepareMethodsAndProperties(component, initial) {
    for(let prop in initial) {
      if (ViewModel.reactKeyword[prop]) continue;
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
      component.vmChanged = true;
      component.setState({});
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

  static loadMixinShare(toLoad, collection, component) {
    if (! toLoad) return;
    if (toLoad instanceof Array) {
      for(let element of toLoad) {
        if (H.isString(element)) {
          component.load( collection[element] );
        } else {
          ViewModel.loadMixinShare( element, collection, component );
        }
      }
    } else if (H.isString(toLoad)) {
      component.load( collection[toLoad] );
    } else {
      for (let ref in toLoad) {
        const container = {};
        const mixshare = toLoad[ref];
        if ( mixshare instanceof Array ) {
          for(let item of mixshare){
            ViewModel.load( collection[item], container, component );
          }
        } else {
          ViewModel.load( collection[mixshare], container, component );
        }
        component[ref] = container;
      }
    }
  }

  static prepareLoad(component) {
    component.load = function(toLoad) {
      if (! toLoad) return;

      // Shared
      ViewModel.loadMixinShare( toLoad.share, ViewModel.shared, component );

      // Mixins
      ViewModel.loadMixinShare( toLoad.mixin, ViewModel.mixins, component );

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
          for(let item in toLoad[hook]) {
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

    ViewModel.add(component);
    
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
    ViewModel.prepareValidations(component);
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
  
  static bindElement(component, bindingText) {
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
            ViewModel.bindSingle(component, bindObject, element, bindNameSingle, bindId);
          }
        } else {
          ViewModel.bindSingle(component, bindObject, element, bindName, bindId);
        }
      }
    }
  }

  static bindSingle(component, bindObject, element, bindName, bindId){
    const bindArg = ViewModel.getBindArgument(component, bindObject, element, bindName, bindId);
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

  static getBindArgument(component, bindObject, element, bindName, bindId){
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
        component.vmAutorun.push( ViewModel.Tracker.autorun(fun) );
      },
      component: component,
      element: element,
      elementBind: bindObject,
      bindName: bindName,
      bindValue: bindObject[bindName],
      getVmValue: ViewModel.getVmValueGetter(component, bindObject[bindName])
    }
    bindArg.setVmValue = getDelayedSetter( bindArg, ViewModel.getVmValueSetter(component, bindObject[bindName]) );
    return bindArg;
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
  'style': 1
}

ViewModel.globals = [];
ViewModel.components = {};
ViewModel.mixins = {};
ViewModel.shared = {};
ViewModel.bindings = {};

Object.defineProperties(ViewModel, {
  "property": { get: function () { return new Property; } }
});

ViewModel.Property = Property;


for(let binding of presetBindings) {
  ViewModel.addBinding(binding);
}