var ReactiveArray,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ReactiveArray = (function(superClass) {
  var isArray;

  extend(ReactiveArray, superClass);

  isArray = function(obj) {
    return obj instanceof Array;
  };

  function ReactiveArray(p1, p2) {
    var dep, item, j, len, pause;
    dep = null;
    pause = false;
    this.changed = function() {
      if (dep && !pause) {
        return dep.changed();
      }
    };
    this.depend = function() {
      return dep.depend();
    };
    if (isArray(p1)) {
      for (j = 0, len = p1.length; j < len; j++) {
        item = p1[j];
        this.push(item);
      }
      dep = p2;
    } else {
      dep = p1;
    }
    this.pause = function() {
      return pause = true;
    };
    this.resume = function() {
      pause = false;
      return this.changed();
    };
  }

  ReactiveArray.prototype.array = function() {
    this.depend();
    return Array.prototype.slice.call(this);
  };

  ReactiveArray.prototype.list = function() {
    this.depend();
    return this;
  };

  ReactiveArray.prototype.depend = function() {
    this.depend();
    return this;
  };

  ReactiveArray.prototype.push = function() {
    var item;
    item = ReactiveArray.__super__.push.apply(this, arguments);
    this.changed();
    return item;
  };

  ReactiveArray.prototype.unshift = function() {
    var item;
    item = ReactiveArray.__super__.unshift.apply(this, arguments);
    this.changed();
    return item;
  };

  ReactiveArray.prototype.pop = function() {
    var item;
    item = ReactiveArray.__super__.pop.apply(this, arguments);
    this.changed();
    return item;
  };

  ReactiveArray.prototype.shift = function() {
    var item;
    item = ReactiveArray.__super__.shift.apply(this, arguments);
    this.changed();
    return item;
  };

  ReactiveArray.prototype.remove = function(valueOrPredicate) {
    var i, predicate, removedValues, underlyingArray, value;
    underlyingArray = this;
    removedValues = [];
    predicate = typeof valueOrPredicate === "function" ? valueOrPredicate : function(value) {
      return value === valueOrPredicate;
    };
    i = 0;
    while (i < underlyingArray.length) {
      value = underlyingArray[i];
      if (predicate(value)) {
        removedValues.push(value);
        underlyingArray.splice(i, 1);
        i--;
      }
      i++;
    }
    if (removedValues.length) {
      this.changed();
    }
    return removedValues;
  };

  ReactiveArray.prototype.clear = function() {
    while (this.length) {
      this.pop();
    }
    this.changed();
    return this;
  };

  ReactiveArray.prototype.concat = function() {
    var a, j, len, ret;
    ret = this.array();
    for (j = 0, len = arguments.length; j < len; j++) {
      a = arguments[j];
      if (a instanceof ReactiveArray) {
        ret = ret.concat(a.array());
      } else {
        ret = ret.concat(a);
      }
    }
    return new ReactiveArray(ret);
  };

  ReactiveArray.prototype.indexOf = function() {
    this.depend();
    return ReactiveArray.__super__.indexOf.apply(this, arguments);
  };

  ReactiveArray.prototype.join = function() {
    this.depend();
    return ReactiveArray.__super__.join.apply(this, arguments);
  };

  ReactiveArray.prototype.lastIndexOf = function() {
    this.depend();
    return ReactiveArray.__super__.lastIndexOf.apply(this, arguments);
  };

  ReactiveArray.prototype.reverse = function() {
    ReactiveArray.__super__.reverse.apply(this, arguments);
    this.changed();
    return this;
  };

  ReactiveArray.prototype.sort = function() {
    ReactiveArray.__super__.sort.apply(this, arguments);
    this.changed();
    return this;
  };

  ReactiveArray.prototype.splice = function() {
    var ret;
    ret = ReactiveArray.__super__.splice.apply(this, arguments);
    this.changed();
    return ret;
  };

  return ReactiveArray;

})(Array);

export default ReactiveArray;