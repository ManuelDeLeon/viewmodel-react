'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = [{
  name: 'default',
  bind: function bind(bindArg) {
    var eventListener = function eventListener(event) {
      bindArg.setVmValue(event);
    };

    bindArg.element.addEventListener(bindArg.bindName, eventListener);
    bindArg.component.vmDestroyed.push(function () {
      bindArg.element.removeEventListener(bindArg.bindName, eventListener);
    });
  }
}, {
  name: 'value',
  events: {
    'change input propertychange': function changeInputPropertychange(bindArg) {
      var newVal = bindArg.element.value;
      var vmVal = bindArg.getVmValue();
      vmVal = vmVal == null ? '' : vmVal.toString();
      if (newVal !== vmVal) {
        bindArg.setVmValue(newVal);
      }
    }
  },
  autorun: function autorun(bindArg) {
    var newVal = bindArg.getVmValue();
    newVal = newVal == null ? '' : newVal.toString();
    if (newVal !== bindArg.element.value) {
      bindArg.element.value = newVal;
    }
  }
}, {
  name: 'check',
  events: {
    'change': function change(bindArg) {
      bindArg.setVmValue(bindArg.element.checked);
    }
  },
  autorun: function autorun(bindArg) {
    var vmValue = bindArg.getVmValue();
    var elementCheck = bindArg.element.checked;
    if (elementCheck !== vmValue) {
      return bindArg.element.checked = vmValue;
    }
  }
}, {
  name: 'check',
  selector: 'input[type=radio]',
  events: {
    'change': function change(bindArg) {
      var checked = bindArg.element.checked;
      bindArg.setVmValue(checked);
      if (checked && bindArg.element.name) {
        (function () {
          var inputs = _reactDom2.default.findDOMNode(bindArg.component).querySelectorAll('input[type=radio][name=' + bindArg.element.name + ']');
          var event = new Event('change');
          Array.prototype.forEach.call(inputs, function (input, i) {
            if (input !== bindArg.element) {
              input.dispatchEvent(event);
            }
          });
        })();
      }
    }
  },
  autorun: function autorun(bindArg) {
    var vmValue = bindArg.getVmValue();
    var elementCheck = bindArg.element.checked;
    if (elementCheck !== vmValue) {
      return bindArg.element.checked = vmValue;
    }
  }
}, {
  name: 'group',
  selector: 'input[type=checkbox]',
  events: {
    'change': function change(bindArg) {
      var vmValue = bindArg.getVmValue();
      var elementValue = bindArg.element.value;
      if (bindArg.element.checked) {
        if (vmValue.indexOf(elementValue) < 0) {
          return vmValue.push(elementValue);
        }
      } else {
        return vmValue.remove(elementValue);
      }
    }
  },
  autorun: function autorun(bindArg) {
    var vmValue = bindArg.getVmValue();
    var elementCheck = bindArg.element.checked;
    var elementValue = bindArg.element.value;
    var newValue = vmValue.indexOf(elementValue) >= 0;
    if (elementCheck !== newValue) {
      return bindArg.element.checked = newValue;
    }
  }
}, {
  name: 'group',
  selector: 'input[type=radio]',
  events: {
    'change': function change(bindArg) {
      if (bindArg.element.checked) {
        bindArg.setVmValue(bindArg.element.value);
        if (bindArg.element.name) {
          (function () {

            var inputs = _reactDom2.default.findDOMNode(bindArg.component).querySelectorAll('input[type=radio][name=' + bindArg.element.name + ']');
            var event = new Event('change');
            Array.prototype.forEach.call(inputs, function (input, i) {
              if (input !== bindArg.element) {
                input.dispatchEvent(event);
              }
            });
          })();
        }
      }
    }
  },
  autorun: function autorun(bindArg) {
    var vmValue = bindArg.getVmValue();
    var elementValue = bindArg.element.value;
    return bindArg.element.checked = vmValue === elementValue;
  }
}];