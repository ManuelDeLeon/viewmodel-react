"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var changeBinding = function changeBinding(eb) {
  return eb.value || eb.check || eb.text || eb.html || eb.focus || eb.hover || eb.toggle || eb.if || eb.visible || eb.unless || eb.hide || eb.enable || eb.disable || eb.ref;
};

exports.default = [{
  name: "default",
  bind: function bind(bindArg) {
    if (bindArg.bindName in bindArg.element && !(bindArg.element[bindArg.bindName] instanceof Function)) {
      // It's an attribute or a component so don't add it as an event
      return;
    }
    var eventListener = function eventListener(event) {
      bindArg.setVmValue(event);
    };

    bindArg.element.addEventListener(bindArg.bindName, eventListener);
    bindArg.component.vmDestroyed.push(function () {
      bindArg.element.removeEventListener(bindArg.bindName, eventListener);
    });
  }
}, {
  name: "value",
  events: {
    "input change": function inputChange(bindArg) {
      var newVal = bindArg.element.value;
      var vmVal = bindArg.getVmValue();
      vmVal = vmVal == null ? "" : vmVal.toString();
      if (newVal !== vmVal || bindArg.elementBind.throttle && (!bindArg.component[bindArg.bindValue].hasOwnProperty("nextVal") || newVal !== bindArg.component[bindArg.bindValue].nextVal)) {
        if (bindArg.elementBind.throttle) {
          bindArg.component[bindArg.bindValue].nextVal = newVal;
        }
        bindArg.setVmValue(newVal);
      }
    }
  },
  autorun: function autorun(bindArg) {
    var newVal = bindArg.getVmValue();
    newVal = newVal == null ? "" : newVal.toString();
    if (newVal !== bindArg.element.value) {
      bindArg.element.value = newVal;
    }
    var event = document.createEvent("HTMLEvents");
    event.initEvent("change", true, false);
    bindArg.element.dispatchEvent(event);
  }
}, {
  name: "check",
  events: {
    change: function change(bindArg) {
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
  name: "check",
  selector: "input[type=radio]",
  bind: function bind(bindArg) {
    var name = bindArg.element.name;
    if (name) {
      var refs = bindArg.component.vmReferences;
      if (!refs.radios) {
        refs.radios = _defineProperty({}, name, []);
      } else if (!refs.radios[name]) {
        refs.radios[name] = [];
      }
      refs.radios[name].push(bindArg.element);
    }
  },
  events: {
    change: function change(bindArg) {
      var checked = bindArg.element.checked;
      bindArg.setVmValue(checked);
      var name = bindArg.element.name;
      if (checked && name) {
        var event = document.createEvent("HTMLEvents");
        event.initEvent("change", true, false);
        var inputs = bindArg.component.vmReferences.radios[name];
        inputs.forEach(function (input) {
          if (input !== bindArg.element) {
            input.dispatchEvent(event);
          }
        });
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
  name: "group",
  selector: "input[type=checkbox]",
  events: {
    change: function change(bindArg) {
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
  name: "group",
  selector: "input[type=radio]",
  bind: function bind(bindArg) {
    var name = bindArg.element.name;
    if (name) {
      var refs = bindArg.component.vmReferences;
      if (!refs.radios) {
        refs.radios = _defineProperty({}, name, []);
      } else if (!refs.radios[name]) {
        refs.radios[name] = [];
      }
      refs.radios[name].push(bindArg.element);
    }
  },
  events: {
    change: function change(bindArg) {
      if (bindArg.element.checked) {
        bindArg.setVmValue(bindArg.element.value);

        var name = bindArg.element.name;
        if (name) {
          var event = document.createEvent("HTMLEvents");
          event.initEvent("change", true, false);
          var inputs = bindArg.component.vmReferences.radios[name];
          inputs.forEach(function (input) {
            if (input !== bindArg.element) {
              input.dispatchEvent(event);
            }
          });
        }
      }
    }
  },
  autorun: function autorun(bindArg) {
    var vmValue = bindArg.getVmValue();
    var elementValue = bindArg.element.value;
    return bindArg.element.checked = vmValue === elementValue;
  }
}, {
  name: "enter",
  events: {
    keyup: function keyup(bindArg, event) {
      if (event.which === 13 || event.keyCode === 13) {
        bindArg.setVmValue(event);
      }
    }
  }
}, {
  name: "esc",
  events: {
    keyup: function keyup(bindArg, event) {
      if (event.which === 27 || event.keyCode === 27) {
        bindArg.setVmValue(event);
      }
    }
  }
}, {
  name: "change",
  bind: function bind(bindArg) {
    var bindValue = changeBinding(bindArg.elementBind);
    bindArg.autorun(function (bindArg, c) {
      var newValue = bindArg.getVmValue(bindValue);
      if (!c.firstRun) {
        bindArg.setVmValue(newValue);
      }
    });
  },
  bindIf: function bindIf(bindArg) {
    return changeBinding(bindArg.elementBind);
  }
}, {
  name: "hover",
  events: {
    mouseenter: function mouseenter(bindArg) {
      bindArg.setVmValue(true);
    },
    mouseleave: function mouseleave(bindArg) {
      bindArg.setVmValue(false);
    }
  }
}, {
  name: "focus",
  events: {
    focus: function focus(bindArg) {
      if (!bindArg.getVmValue()) bindArg.setVmValue(true);
    },
    blur: function blur(bindArg) {
      if (bindArg.getVmValue()) bindArg.setVmValue(false);
    }
  },
  autorun: function autorun(bindArg) {
    var value = bindArg.getVmValue();
    if (bindArg.element === document.activeElement !== value) {
      if (value) {
        bindArg.element.focus();
      } else {
        bindArg.element.blur();
      }
    }
  }
}, {
  name: "toggle",
  events: {
    click: function click(bindArg) {
      bindArg.setVmValue(!bindArg.getVmValue());
    }
  }
}, {
  name: "ref",
  bind: function bind(bindArg) {
    bindArg.component[bindArg.bindValue] = bindArg.element;
  }
}];