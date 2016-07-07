import ReactDOM from 'react-dom';

const changeBinding = function(eb) {
  return eb.value || eb.check || eb.text || eb.html || eb.focus || eb.hover || eb.toggle || eb.if || eb.visible || eb.unless || eb.hide || eb.enable || eb.disable;
};

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
  },
  {
    name: 'enter',
    events: {
      'keyup': function(bindArg, event) {
        if (event.which === 13 || event.keyCode === 13) {
          bindArg.setVmValue(event);
        }
      }
    }
  },
  {
    name: 'change',
    bind: function(bindArg) {
      const bindValue = changeBinding(bindArg.elementBind);
      bindArg.autorun(function(bindArg, c) {
        const newValue = bindArg.getVmValue(bindValue);
        if (!c.firstRun) {
          bindArg.setVmValue(newValue)
        }
      });
    },
    bindIf: function(bindArg) {
      return changeBinding(bindArg.elementBind);
    }
  },
  {
    name: 'hover',
    events: {
      mouseenter: function(bindArg) {
        bindArg.setVmValue(true);
      },
      mouseleave: function(bindArg) {
        bindArg.setVmValue(false);
      }
    }
  },
  {
    name: 'focus',
    events: {
      focus: function(bindArg) {
        if (!bindArg.getVmValue())
          bindArg.setVmValue(true);
      },
      blur: function(bindArg) {
        if (bindArg.getVmValue())
          bindArg.setVmValue(false);
      }
    },
    autorun: function(bindArg) {
      const value = bindArg.getVmValue();
      if ((bindArg.element === document.activeElement) !== value) {
        if (value) {
          bindArg.element.focus();
        } else {
          bindArg.element.blur();
        }
      }
    }
  }
]