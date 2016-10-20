const ValueTypes = {
  string: 1,
  number: 2,
  integer: 3,
  boolean: 4,
  object: 5,
  date: 6,
  array: 7,
  any: 8
};

const isNull = function(obj) {
  return obj === null;
};

const isUndefined = function(obj) {
  return typeof obj === "undefined";
};

const isArray = function(obj){
  return obj instanceof Array;
}

const isNumber = function(obj) {
  // jQuery's isNumeric
  return !isArray(obj) && (obj - parseFloat(obj) + 1) >= 0;
};

const isInteger = function(n) {
  if (
    !isNumber(n)
    || ~n.toString().indexOf('.')
  ) return false;

  var value = parseFloat(n);
  return value === +value && value === (value | 0);
};

const isObject = function(obj) { return (typeof obj === "object") && (obj !== null) && !( obj instanceof Date) ; };

const isString = function(str) {
  return typeof str === 'string' || str instanceof String;
}

const isBoolean = function(val) {
  return typeof val === 'boolean';
}

const isDate = function(obj){
  return obj instanceof Date;
}

export default class Property {
  constructor(){
    this.checks = [];
    this.checksAsync = [];
    this.convertIns = [];
    this.convertOuts = [];
    this.beforeUpdates = [];
    this.afterUpdates = [];
    this.defaultValue = undefined;
    this.validMessageValue = "";
    this.invalidMessageValue = "";
    this.valueType = ValueTypes.any;

  }
  verify(value, context){
    for(var check of this.checks) {
      if (!check.call(context, value)) return false;
    }
    return true;
  }
  verifyAsync(value, done, context){
    for(var check of this.checksAsync) {
      check.call(context, value, done);
    }
  }
  hasAsync(){
    return this.checksAsync.length;
  }
  setDefault(value){
    if(typeof this.defaultValue === "undefined") this.defaultValue = value;
  }

  convertIn(fun){
    this.convertIns.push(fun);
    return this;
  }
  convertOut(fun){
    this.convertOuts.push(fun);
    return this;
  }

  beforeUpdate(fun){
    this.beforeUpdates.push(fun);
    return this;
  }
  afterUpdate(fun){
    this.afterUpdates.push(fun);
    return this;
  }

  convertValueIn(value, context){
    let final = value;
    for(var convert of this.convertIns) {
      final = convert.call(context, final);
    }
    return final;
  }

  convertValueOut(value, context){
    let final = value;
    for(var convert of this.convertOuts) {
      final = convert.call(context, final);
    }
    return final;
  }

  beforeValueUpdate(value, context){
    for(var fun of this.beforeUpdates) {
      fun.call(context, value);
    }
  }

  afterValueUpdate(value, context){
    for(var fun of this.afterUpdates) {
      fun.call(context, value);
    }
  }


  min(minValue) {
    this.checks.push((value) => {
      if (this.valueType === ValueTypes.string && isString(value) ) {
        return value.length >= minValue
      } else {
        return value >= minValue
      }
    });
    return this;
  }

  max(maxValue) {
    this.checks.push((value) => {
      if (this.valueType === ValueTypes.string && isString(value) ) {
        return value.length <= maxValue
      } else  {
        return value <= maxValue
      }
    });
    return this;
  }

  equal(value) {
    this.checks.push( (v) => v === value);
    return this;
  }
  notEqual(value) {
    this.checks.push( (v) => v !== value);
    return this;
  }

  between(min, max) {
    this.checks.push((value) => {
      if (this.valueType === ValueTypes.string && isString(value) ) {
        return value.length >= min && value.length <= max;
      } else {
        return value >= min && value <= max;
      }
    });
    return this;
  }
  notBetween(min, max) {
    this.checks.push((value) => {
      if (this.valueType === ValueTypes.string && isString(value) ) {
        return value.length < min || value.length > max;
      } else {
        return value < min || value > max;
      }
    });
    return this;
  }

  regex(regexp) {
    this.checks.push( (v) => regexp.test(v) );
    return this;
  }

  validate(fun) {
    this.checks.push(fun);
    return this;
  }

  validateAsync(fun){
    this.checksAsync.push(fun);
    return this;
  }

  default(value) {
    this.defaultValue = value;
    return this;
  }
  validMessage(message) {
    this.validMessageValue = message;
    return this;
  }
  invalidMessage(message) {
    this.invalidMessageValue = message;
    return this;
  }

  get notBlank() {
    this.checks.push((value) => isString(value) && !!value.trim().length);
    return this;
  }
  get string() {
    this.setDefault("");
    this.valueType = ValueTypes.string;
    this.checks.push((value) => isString(value));
    return this;
  }
  get integer() {
    this.setDefault(0);
    this.valueType = ValueTypes.integer;
    this.checks.push((n) => isInteger(n) );
    return this;
  }
  get number() {
    this.setDefault(0);
    this.valueType = ValueTypes.number;
    this.checks.push((value) => isNumber(value));
    return this;
  }
  get boolean() {
    this.setDefault(false);
    this.valueType = ValueTypes.boolean;
    this.checks.push((value) => isBoolean(value));
    return this;
  }
  get object() {
    this.setDefault({});
    this.valueType = ValueTypes.object;
    this.checks.push((value) => isObject(value));
    return this;
  }
  get date() {
    this.setDefault(new Date());
    this.valueType = ValueTypes.date;
    this.checks.push((value) => value instanceof Date);
    return this;
  }
  get array() {
    this.setDefault([]);
    this.valueType = ValueTypes.array;
    this.checks.push((value) => _.isArray(value));
    return this;
  }
  get convert(){
    if (this.valueType === ValueTypes.integer){
      this.convertIn( value => parseInt(value) );
    } else if(this.valueType === ValueTypes.string) {
      this.convertIn( value => value.toString() );
    } else if(this.valueType === ValueTypes.number) {
      this.convertIn( value => parseFloat(value) );
    } else if(this.valueType === ValueTypes.date) {
      this.convertIn( value => Date.parse(value) );
    } else if(this.valueType === ValueTypes.boolean) {
      this.convertIn( value => !!value );
    }
    return this;
  }



  static validator(value) {
    const property = new Property();
    if(isString(value)) {
      return property.string;
    } else if(isNumber(value)) {
      return property.number;
    } else if(isDate(value)) {
      return property.date;
    } else if(isBoolean(value)) {
      return property.boolean;
    } else if(isObject(value)) {
      return property.object;
    } else if(isArray(value)) {
      return property.array;
    } else {
      return property;
    }
  }
}

