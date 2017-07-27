"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ValueTypes = {
  string: 1,
  number: 2,
  integer: 3,
  boolean: 4,
  object: 5,
  date: 6,
  array: 7,
  any: 8
};

var isNull = function isNull(obj) {
  return obj === null;
};

var isUndefined = function isUndefined(obj) {
  return typeof obj === "undefined";
};

var isArray = function isArray(obj) {
  return obj instanceof Array;
};

var isNumber = function isNumber(obj) {
  // jQuery's isNumeric
  return !isArray(obj) && obj - parseFloat(obj) + 1 >= 0;
};

var isInteger = function isInteger(n) {
  if (!isNumber(n) || ~n.toString().indexOf(".")) return false;

  var value = parseFloat(n);
  return value === +value && value === (value | 0);
};

var isObject = function isObject(obj) {
  return (typeof obj === "undefined" ? "undefined" : _typeof(obj)) === "object" && obj !== null && !(obj instanceof Date);
};

var isString = function isString(str) {
  return typeof str === "string" || str instanceof String;
};

var isBoolean = function isBoolean(val) {
  return typeof val === "boolean";
};

var isDate = function isDate(obj) {
  return obj instanceof Date;
};

var Property = function () {
  function Property() {
    _classCallCheck(this, Property);

    this.checks = [];
    this.checksAsync = [];
    this.convertIns = [];
    this.convertOuts = [];
    this.beforeUpdates = [];
    this.afterUpdates = [];
    this.defaultValue = undefined;
    this.validMessageValue = "";
    this.invalidMessageValue = "";
    this.validatingMessageValue = "";
    this.valueType = ValueTypes.any;
  }

  _createClass(Property, [{
    key: "verify",
    value: function verify(value, context) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.checks[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var check = _step.value;

          if (!check.call(context, value)) return false;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return true;
    }
  }, {
    key: "verifyAsync",
    value: function verifyAsync(value, done, context) {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = this.checksAsync[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var check = _step2.value;

          check.call(context, value, done);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  }, {
    key: "hasAsync",
    value: function hasAsync() {
      return this.checksAsync.length;
    }
  }, {
    key: "setDefault",
    value: function setDefault(value) {
      if (typeof this.defaultValue === "undefined") this.defaultValue = value;
    }
  }, {
    key: "convertIn",
    value: function convertIn(fun) {
      this.convertIns.push(fun);
      return this;
    }
  }, {
    key: "convertOut",
    value: function convertOut(fun) {
      this.convertOuts.push(fun);
      return this;
    }
  }, {
    key: "beforeUpdate",
    value: function beforeUpdate(fun) {
      this.beforeUpdates.push(fun);
      return this;
    }
  }, {
    key: "afterUpdate",
    value: function afterUpdate(fun) {
      this.afterUpdates.push(fun);
      return this;
    }
  }, {
    key: "convertValueIn",
    value: function convertValueIn(value, context) {
      var final = value;
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.convertIns[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var convert = _step3.value;

          final = convert.call(context, final);
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      return final;
    }
  }, {
    key: "convertValueOut",
    value: function convertValueOut(value, context) {
      var final = value;
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = this.convertOuts[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var convert = _step4.value;

          final = convert.call(context, final);
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      return final;
    }
  }, {
    key: "beforeValueUpdate",
    value: function beforeValueUpdate(value, context) {
      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = this.beforeUpdates[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var fun = _step5.value;

          fun.call(context, value);
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }
    }
  }, {
    key: "afterValueUpdate",
    value: function afterValueUpdate(value, context) {
      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = this.afterUpdates[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var fun = _step6.value;

          fun.call(context, value);
        }
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6.return) {
            _iterator6.return();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }
    }
  }, {
    key: "min",
    value: function min(minValue) {
      var _this = this;

      this.checks.push(function (value) {
        if (_this.valueType === ValueTypes.string && isString(value)) {
          return value.length >= minValue;
        } else {
          return value >= minValue;
        }
      });
      return this;
    }
  }, {
    key: "max",
    value: function max(maxValue) {
      var _this2 = this;

      this.checks.push(function (value) {
        if (_this2.valueType === ValueTypes.string && isString(value)) {
          return value.length <= maxValue;
        } else {
          return value <= maxValue;
        }
      });
      return this;
    }
  }, {
    key: "equal",
    value: function equal(value) {
      this.checks.push(function (v) {
        return v === value;
      });
      return this;
    }
  }, {
    key: "notEqual",
    value: function notEqual(value) {
      this.checks.push(function (v) {
        return v !== value;
      });
      return this;
    }
  }, {
    key: "between",
    value: function between(min, max) {
      var _this3 = this;

      this.checks.push(function (value) {
        if (_this3.valueType === ValueTypes.string && isString(value)) {
          return value.length >= min && value.length <= max;
        } else {
          return value >= min && value <= max;
        }
      });
      return this;
    }
  }, {
    key: "notBetween",
    value: function notBetween(min, max) {
      var _this4 = this;

      this.checks.push(function (value) {
        if (_this4.valueType === ValueTypes.string && isString(value)) {
          return value.length < min || value.length > max;
        } else {
          return value < min || value > max;
        }
      });
      return this;
    }
  }, {
    key: "regex",
    value: function regex(regexp) {
      this.checks.push(function (v) {
        return regexp.test(v);
      });
      return this;
    }
  }, {
    key: "validate",
    value: function validate(fun) {
      this.checks.push(fun);
      return this;
    }
  }, {
    key: "validateAsync",
    value: function validateAsync(fun) {
      this.checksAsync.push(fun);
      return this;
    }
  }, {
    key: "default",
    value: function _default(value) {
      this.defaultValue = value;
      return this;
    }
  }, {
    key: "validMessage",
    value: function validMessage(message) {
      this.validMessageValue = message;
      return this;
    }
  }, {
    key: "invalidMessage",
    value: function invalidMessage(message) {
      this.invalidMessageValue = message;
      return this;
    }
  }, {
    key: "validatingMessage",
    value: function validatingMessage(message) {
      this.validatingMessageValue = message;
      return this;
    }
  }, {
    key: "notBlank",
    get: function get() {
      this.checks.push(function (value) {
        return isString(value) && !!value.trim().length;
      });
      return this;
    }
  }, {
    key: "string",
    get: function get() {
      this.setDefault("");
      this.valueType = ValueTypes.string;
      this.checks.push(function (value) {
        return isString(value);
      });
      return this;
    }
  }, {
    key: "integer",
    get: function get() {
      this.setDefault(0);
      this.valueType = ValueTypes.integer;
      this.checks.push(function (n) {
        return isInteger(n);
      });
      return this;
    }
  }, {
    key: "number",
    get: function get() {
      this.setDefault(0);
      this.valueType = ValueTypes.number;
      this.checks.push(function (value) {
        return isNumber(value);
      });
      return this;
    }
  }, {
    key: "boolean",
    get: function get() {
      this.setDefault(false);
      this.valueType = ValueTypes.boolean;
      this.checks.push(function (value) {
        return isBoolean(value);
      });
      return this;
    }
  }, {
    key: "object",
    get: function get() {
      this.setDefault({});
      this.valueType = ValueTypes.object;
      this.checks.push(function (value) {
        return isObject(value);
      });
      return this;
    }
  }, {
    key: "date",
    get: function get() {
      this.setDefault(new Date());
      this.valueType = ValueTypes.date;
      this.checks.push(function (value) {
        return value instanceof Date;
      });
      return this;
    }
  }, {
    key: "array",
    get: function get() {
      this.setDefault([]);
      this.valueType = ValueTypes.array;
      this.checks.push(function (value) {
        return _.isArray(value);
      });
      return this;
    }
  }, {
    key: "convert",
    get: function get() {
      if (this.valueType === ValueTypes.integer) {
        this.convertIn(function (value) {
          return parseInt(value);
        });
      } else if (this.valueType === ValueTypes.string) {
        this.convertIn(function (value) {
          return value.toString();
        });
      } else if (this.valueType === ValueTypes.number) {
        this.convertIn(function (value) {
          return parseFloat(value);
        });
      } else if (this.valueType === ValueTypes.date) {
        this.convertIn(function (value) {
          return Date.parse(value);
        });
      } else if (this.valueType === ValueTypes.boolean) {
        this.convertIn(function (value) {
          return !!value;
        });
      }
      return this;
    }
  }], [{
    key: "validator",
    value: function validator(value) {
      var property = new Property();
      if (isString(value)) {
        return property.string;
      } else if (isNumber(value)) {
        return property.number;
      } else if (isDate(value)) {
        return property.date;
      } else if (isBoolean(value)) {
        return property.boolean;
      } else if (isObject(value)) {
        return property.object;
      } else if (isArray(value)) {
        return property.array;
      } else {
        return property;
      }
    }
  }]);

  return Property;
}();

exports.default = Property;