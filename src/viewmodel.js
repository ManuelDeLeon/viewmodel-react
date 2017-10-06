import H from "./Helper";
import parseBind from "./parseBind";

const delayed = {};
const PENDING_AUTORUNS = "PendingAutoruns";
const ViewModel = {
  vmStateChanged: Symbol("vmStateChanged"),
  vmAutoruns: Symbol("vmAutoruns"),
  vmId: Symbol("vmId"),

  delay(time, nameOrFunc, fn) {
    let d, name;
    const func = fn || nameOrFunc;
    if (fn) {
      name = nameOrFunc;
    }
    if (name) {
      d = delayed[name];
    }
    if (d != null) {
      clearTimeout(d);
    }
    const id = setTimeout(function() {
      if (name) delete delayed[name];
      func();
    }, time);
    if (name) {
      delayed[name] = id;
    }
  },
  currentAutorun: null,
  currentAutorunId: 1,
  pendingAutoruns: {},
  executeAutorun(autorun) {
    ViewModel.currentAutorun = autorun;
    autorun();
    ViewModel.currentAutorun = null;
    ViewModel.currentAutorunId += 1;
  },
  queueAutorun(id, autorun) {
    if (ViewModel.pendingAutoruns[id]) return;
    ViewModel.pendingAutoruns[id] = autorun;
    ViewModel.delay(10, PENDING_AUTORUNS, function() {
      const pending = Object.assign({}, ViewModel.pendingAutoruns);
      ViewModel.pendingAutoruns = {};
      for (let id in pending) {
        pending[id]();
      }
    });
  },
  createProp(initialValue, component) {
    let _value = initialValue;
    const autoruns = {};
    const depend = function() {
      if (ViewModel.currentAutorun) {
        autoruns[ViewModel.currentAutorunId] = ViewModel.currentAutorun;
      }
    };
    const changed = function() {
      for (let id in autoruns) {
        ViewModel.queueAutorun(id, autoruns[id]);
      }
      if (component && component.vmUpdateState) component.vmUpdateState();
    };
    const funProp = function(value) {
      if (arguments.length && _value !== value) {
        _value = value;
        changed();
      } else {
        depend();
      }
      return _value;
    };
    funProp.reset = () => {
      _value = initialValue;
      changed();
    };
    Object.defineProperty(funProp, "value", {
      get() {
        return _value;
      }
    });
    return funProp;
  },

  getValue(container, bindValue, viewmodel) {
    let value;
    if (!viewmodel) viewmodel = container;
    bindValue = bindValue.trim();
    const negate = bindValue.charAt(0) === "!";
    if (negate) {
      bindValue = bindValue.substring(1);
    }
    const ref = H.firstToken(bindValue),
      token = ref[0],
      tokenIndex = ref[1];
    const parenIndexStart = bindValue.indexOf("(");
    if (tokenIndex > 0 && (!~parenIndexStart || tokenIndex < parenIndexStart)) {
      const left = () =>
        ViewModel.getValue(
          container,
          bindValue.substring(0, tokenIndex),
          viewmodel
        );
      const right = () =>
        ViewModel.getValue(
          container,
          bindValue.substring(tokenIndex + token.length),
          viewmodel
        );
      value = H.tokens[token.trim()](left, right);
    } else if (bindValue === "this") {
      value = viewmodel;
    } else if (H.isQuoted(bindValue)) {
      value = H.removeQuotes(bindValue);
    } else {
      let dotIndex = bindValue.search(H.dotRegex);
      if (~dotIndex && bindValue.charAt(dotIndex) !== ".") {
        dotIndex += 1;
      }

      const parenIndexEnd = H.getMatchingParenIndex(bindValue, parenIndexStart);
      const breakOnFirstDot =
        ~dotIndex &&
        (!~parenIndexStart ||
          dotIndex < parenIndexStart ||
          dotIndex === parenIndexEnd + 1);
      if (breakOnFirstDot) {
        const newBindValue = bindValue.substring(dotIndex + 1);
        const newContainer = ViewModel.getValue(
          container,
          bindValue.substring(0, dotIndex),
          viewmodel
        );
        value = ViewModel.getValue(newContainer, newBindValue, viewmodel);
      } else {
        if (container == null) {
          value = undefined;
        } else {
          let name = bindValue;
          const args = [];
          if (~parenIndexStart) {
            const parsed = parseBind(bindValue);
            name = Object.keys(parsed)[0];
            const second = parsed[name];
            if (second.length > 2) {
              const ref1 = second.substr(1, second.length - 2).split(",");
              for (let j = 0, len = ref1.length; j < len; j++) {
                let arg = ref1[j].trim();
                let newArg;
                if (arg === "this") {
                  newArg = viewmodel;
                } else if (H.isQuoted(arg)) {
                  newArg = H.removeQuotes(arg);
                } else {
                  const neg = arg.charAt(0) === "!";
                  if (neg) {
                    arg = arg.substring(1);
                  }
                  newArg = ViewModel.getValue(viewmodel, arg, viewmodel);
                  if (neg) {
                    newArg = !newArg;
                  }
                }
                args.push(newArg);
              }
            }
          }
          const primitive = H.isPrimitive(name);
          if (container[ViewModel.vmId] && !primitive && !container[name]) {
            container[name] = ViewModel.createProp("", container);
          }
          if (
            !primitive &&
            !(
              container != null &&
              (container[name] != null ||
                H.isObject(container) ||
                H.isString(container))
            )
          ) {
            value = undefined;
          } else if (primitive) {
            value = H.getPrimitive(name);
          } else {
            if (H.isFunction(container[name])) {
              value = container[name].apply(container, args);
            } else {
              value = container[name];
            }
          }
        }
      }
    }
    if (negate) {
      value = !value;
    }
    return value;
  }
};
module.exports = ViewModel;
