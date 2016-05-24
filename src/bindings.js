import ReactDOM from 'react-dom';

export default [
  {
    name: 'default',
    bind: function(bindArg) {
      const eventListener = function (event) {
        bindArg.setVmValue(event);
      }

      bindArg.element.addEventListener(bindArg.bindName, eventListener);
      bindArg.component.vmDestroyed.push(() => {
        bindArg.element.removeEventListener(bindArg.bindName, eventListener)
      });
    }
  },
  {
    name: 'value',
    events: {
      'change input propertychange': function (bindArg) {
        let newVal = bindArg.element.value;
        let vmVal = bindArg.getVmValue();
        vmVal = vmVal == null ? '' : vmVal.toString();
        if (newVal !== vmVal) {
          bindArg.setVmValue(newVal);
        }
      }
    },
    autorun: function(bindArg){
      let newVal = bindArg.getVmValue();
      newVal = newVal == null ? '' : newVal.toString();
      if (newVal !== bindArg.element.value) {
        bindArg.element.value = newVal;
      }
    },
  },
  {
    name: 'check',
    events: {
      'change': function(bindArg) {
        bindArg.setVmValue(bindArg.element.checked);
      }
    },
    autorun: function(bindArg) {
      const vmValue = bindArg.getVmValue();
      const elementCheck = bindArg.element.checked;
      if (elementCheck !== vmValue) {
        return bindArg.element.checked = vmValue;
      }
    }
  },
  {
    name: 'check',
    selector: 'input[type=radio]',
    events: {
      'change': function(bindArg) {
        const checked = bindArg.element.checked;
        bindArg.setVmValue(checked);
        if (checked && bindArg.element.name) {
          const inputs = ReactDOM.findDOMNode(bindArg.component).querySelectorAll(`input[type=radio][name=${ bindArg.element.name }]`);
          const event = new Event('change');
          Array.prototype.forEach.call(inputs, function (input, i) {
            if (input !== bindArg.element) {
              input.dispatchEvent(event);
            }
          });
        }
      }
    },
    autorun: function(bindArg) {
      const vmValue = bindArg.getVmValue();
      const elementCheck = bindArg.element.checked;
      if (elementCheck !== vmValue) {
        return bindArg.element.checked = vmValue;
      }
    }
  },
  {
    name: 'group',
    selector: 'input[type=checkbox]',
    events: {
      'change': function(bindArg) {
        const vmValue = bindArg.getVmValue();
        const elementValue = bindArg.element.value;
        if (bindArg.element.checked) {
          if (vmValue.indexOf(elementValue) < 0) {
            return vmValue.push(elementValue);
          }
        } else {
          return vmValue.remove(elementValue);
        }
      }
    },
    autorun: function(bindArg) {
      const vmValue = bindArg.getVmValue();
      const elementCheck = bindArg.element.checked;
      const elementValue = bindArg.element.value;
      const newValue = vmValue.indexOf(elementValue) >= 0;
      if (elementCheck !== newValue) {
        return bindArg.element.checked = newValue;
      }
    }
  },
  {
    name: 'group',
    selector: 'input[type=radio]',
    events: {
      'change': function(bindArg) {
        if (bindArg.element.checked) {
          bindArg.setVmValue(bindArg.element.value);
          if (bindArg.element.name) {

            const inputs = ReactDOM.findDOMNode(bindArg.component).querySelectorAll(`input[type=radio][name=${ bindArg.element.name }]`);
            const event = new Event('change');
            Array.prototype.forEach.call(inputs, function (input, i) {
              if (input !== bindArg.element) {
                input.dispatchEvent(event);
              }
            });
          }
        }
      }
    },
    autorun: function(bindArg) {
      const vmValue = bindArg.getVmValue();
      const elementValue = bindArg.element.value;
      return bindArg.element.checked = (vmValue === elementValue);
    }
  }
]