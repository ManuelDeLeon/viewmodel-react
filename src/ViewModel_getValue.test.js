import ViewModel from "./ViewModel";

describe(`ViewModel.getValue`, () => {
  it(`resolves 1 + 'A'`, () => {
    const value = ViewModel.getValue({}, `1 + 'A'`);
    expect(value).toBe("1A");
  });
  it(`short circuits false && true`, () => {
    let calledF = false;
    let calledT = false;
    const comp = {
      f() {
        calledF = true;
        return false;
      },
      t() {
        calledT = true;
        return true;
      }
    };
    const value = ViewModel.getValue(comp, `f && t`);
    expect(calledF).toBe(true);
    expect(calledT).toBe(false);
    expect(value).toBe(false);
  });
  it(`short circuits false || true`, () => {
    let calledF = false;
    let calledT = false;
    const comp = {
      f() {
        calledF = true;
        return false;
      },
      t() {
        calledT = true;
        return true;
      }
    };
    const value = ViewModel.getValue(comp, `t || f`);
    expect(calledF).toBe(false);
    expect(calledT).toBe(true);
    expect(value).toBe(true);
  });
  it(`calls method with params: call(1, -2)`, () => {
    const comp = {
      call: (a, b) => a + b
    };
    const value = ViewModel.getValue(comp, `call(1, -2)`);
    expect(value).toBe(comp.call(1, -2));
  });
  it(`calls method with params: call(1 - 2)`, () => {
    const comp = {
      call: a => a
    };
    const value = ViewModel.getValue(comp, `call(1 - 2)`);
    expect(value).toBe(comp.call(1 - 2));
  });
  it(`calls method with params: call(1, 1 - 2)`, () => {
    const comp = {
      call: (a, b) => a + b
    };
    const value = ViewModel.getValue(comp, `call(1, 1 - 2)`);
    expect(value).toBe(comp.call(1, 1 - 2));
  });

  it(`calls method with params: name(address.zip), address and zip are regular props`, () => {
    const comp = {
      name: a => (a === 100 ? "A" : "B"),
      address: {
        zip: 100
      }
    };
    const value = ViewModel.getValue(comp, `name(address.zip)`);
    expect(value).toBe(comp.name(comp.address.zip));
  });

  it(`calls method with params: name(address.zip), address is function and zip is regular prop`, () => {
    const comp = {
      name: a => (a === 100 ? "A" : "B"),
      address() {
        return {
          zip: 100
        };
      }
    };
    const value = ViewModel.getValue(comp, `name(address.zip)`);
    expect(value).toBe(comp.name(comp.address().zip));
  });

  it(`calls method with params: name(address.zip), address and zip are functions`, () => {
    const comp = {
      name: a => (a === 100 ? "A" : "B"),
      address() {
        return {
          zip() {
            return 100;
          }
        };
      }
    };
    const value = ViewModel.getValue(comp, `name(address.zip)`);
    expect(value).toBe(comp.name(comp.address().zip()));
  });

  it(`resolves !'A'`, () => {
    const value = ViewModel.getValue({}, `!'A'`);
    expect(value).toBe(false);
  });

  it(`resolves name (name is func)`, () => {
    const comp = {
      name: () => "A"
    };
    const value = ViewModel.getValue(comp, `name`);
    expect(value).toBe(comp.name());
  });
  it(`resolves name()`, () => {
    const comp = {
      name: () => "A"
    };
    const value = ViewModel.getValue(comp, `name()`);
    expect(value).toBe(comp.name());
  });
  it(`resolves name('A')`, () => {
    const comp = {
      name: a => a === "A"
    };
    const value = ViewModel.getValue(comp, `name('A')`);
    expect(value).toBe(comp.name("A"));
  });
  it(`resolves name(null)`, () => {
    const comp = {
      name: a => a === null
    };
    const value = ViewModel.getValue(comp, `name(null)`);
    expect(value).toBe(comp.name(null));
  });
  it(`resolves name('A', 1)`, () => {
    const comp = {
      name: (a, b) => a === "A" && b === 1
    };
    const value = ViewModel.getValue(comp, `name("A", 1)`);
    expect(value).toBe(comp.name("A", 1));
  });

  it(`doesn't give arguments to name()`, () => {
    const comp = {
      name: () => arguments.length
    };
    const value = ViewModel.getValue(comp, `name()`);
    expect(value).toBe(comp.name());
  });
  it(`resolves name (name is prop)`, () => {
    const comp = {
      name: "A"
    };
    const value = ViewModel.getValue(comp, `name`);
    expect(value).toBe(comp.name);
  });

  it(`resolves name.first (name: func , first: func)`, () => {
    const comp = {
      name: () => ({
        first() {
          return "A";
        }
      })
    };
    const value = ViewModel.getValue(comp, `name.first`);
    expect(value).toBe(comp.name().first());
  });
  it(`resolves name.first (name: func , first: prop)`, () => {
    const comp = {
      name: () => ({
        first: "A"
      })
    };
    const value = ViewModel.getValue(comp, `name.first`);
    expect(value).toBe(comp.name().first);
  });

  it(`resolves name.first (name: prop , first: func)`, () => {
    const comp = {
      name: {
        first() {
          return "A";
        }
      }
    };
    const value = ViewModel.getValue(comp, `name.first`);
    expect(value).toBe(comp.name.first());
  });
  it(`resolves name.first (name: prop , first: prop)`, () => {
    const comp = {
      name: {
        first: "A"
      }
    };
    const value = ViewModel.getValue(comp, `name.first`);
    expect(value).toBe(comp.name.first);
  });

  it(`resolves name(first, second) with strings`, () => {
    const comp = {
      name: (a, b) => comp.first === a && comp.second === b,
      first: "A",
      second: "B"
    };
    const value = ViewModel.getValue(comp, `name(first, second)`);
    expect(value).toBe(comp.name(comp.first, comp.second));
  });

  it(`resolves name(first, second) with numbers`, () => {
    const comp = {
      name: (a, b) => comp.first === a && comp.second === b,
      first: 1,
      second: 2
    };
    const value = ViewModel.getValue(comp, `name(first, second)`);
    expect(value).toBe(comp.name(comp.first, comp.second));
  });

  it(`resolves name(first, second) with booleans`, () => {
    const comp = {
      name: (a, b) => comp.first === a && comp.second === b,
      first: true,
      second: false
    };
    const value = ViewModel.getValue(comp, `name(first, second)`);
    expect(value).toBe(comp.name(comp.first, comp.second));
  });

  it(`resolves name(first, second) with nulls`, () => {
    const comp = {
      name: (a, b) => comp.first === a && comp.second === b,
      first: null,
      second: null
    };
    const value = ViewModel.getValue(comp, `name(first, second)`);
    expect(value).toBe(comp.name(comp.first, comp.second));
  });

  it(`resolves name(1, 2)`, () => {
    const comp = {
      name: (a, b) => a + b
    };
    const value = ViewModel.getValue(comp, `name(1, 2)`);
    expect(value).toBe(comp.name(1, 2));
  });

  it(`resolves name(false, true)`, () => {
    const comp = {
      name: (a, b) => a === false && b === true
    };
    const value = ViewModel.getValue(comp, `name(false, true)`);
    expect(value).toBe(comp.name(false, true));
  });

  it(`resolves first + second (string, string)`, () => {
    const comp = {
      first: "A",
      second: "B"
    };
    const value = ViewModel.getValue(comp, `first + second`);
    expect(value).toBe(comp.first + comp.second);
  });
  it(`resolves first + second (string, number)`, () => {
    const comp = {
      first: "A",
      second: 1
    };
    const value = ViewModel.getValue(comp, `first + second`);
    expect(value).toBe(comp.first + comp.second);
  });

  it(`resolves first + second (number, number)`, () => {
    const comp = {
      first: 2,
      second: 1
    };
    const value = ViewModel.getValue(comp, `first + second`);
    expect(value).toBe(comp.first + comp.second);
  });

  it(`resolves first + ' - ' + second (string, string)`, () => {
    const comp = {
      first: "A",
      second: "B"
    };
    const value = ViewModel.getValue(comp, `first + ' - ' + second`);
    expect(value).toBe(comp.first + " - " + comp.second);
  });
  it(`resolves first + ' - ' + second (string, number)`, () => {
    const comp = {
      first: "A",
      second: 1
    };
    const value = ViewModel.getValue(comp, `first + ' - ' + second`);
    expect(value).toBe(comp.first + " - " + comp.second);
  });
  it(`resolves first - second`, () => {
    const comp = {
      first: 2,
      second: 1
    };
    const value = ViewModel.getValue(comp, `first - second`);
    expect(value).toBe(comp.first - comp.second);
  });
  it(`resolves first * second`, () => {
    const comp = {
      first: 2,
      second: 1
    };
    const value = ViewModel.getValue(comp, `first * second`);
    expect(value).toBe(comp.first * comp.second);
  });
  it(`resolves first / second`, () => {
    const comp = {
      first: 2,
      second: 1
    };
    const value = ViewModel.getValue(comp, `first / second`);
    expect(value).toBe(comp.first / comp.second);
  });
  it(`resolves first && second`, () => {
    const comp = {
      first: true,
      second: false
    };
    const value = ViewModel.getValue(comp, `first && second`);
    expect(value).toBe(comp.first && comp.second);
  });
  it(`resolves first || second`, () => {
    const comp = {
      first: false,
      second: true
    };
    const value = ViewModel.getValue(comp, `first || second`);
    expect(value).toBe(comp.first || comp.second);
  });
  it(`resolves first == second`, () => {
    const comp = {
      first: 1,
      second: "1"
    };
    const value = ViewModel.getValue(comp, `first == second`);
    expect(value).toBe(comp.first == comp.second);
  });
  it(`resolves first === second`, () => {
    const comp = {
      first: 1,
      second: "1"
    };
    const value = ViewModel.getValue(comp, `first === second`);
    expect(value).toBe(comp.first === comp.second);
  });
  it(`resolves first != second`, () => {
    const comp = {
      first: 1,
      second: "1"
    };
    const value = ViewModel.getValue(comp, `first != second`);
    expect(value).toBe(comp.first != comp.second);
  });
  it(`resolves first !== second`, () => {
    const comp = {
      first: 1,
      second: "1"
    };
    const value = ViewModel.getValue(comp, `first !== second`);
    expect(value).toBe(comp.first !== comp.second);
  });

  it(`resolves first ** second`, () => {
    const comp = {
      first: 3,
      second: 7
    };
    const value = ViewModel.getValue(comp, `first ** second`);
    expect(value).toBe(comp.first ** comp.second);
  });

  it(`resolves first % second`, () => {
    const comp = {
      first: 3,
      second: 7
    };
    const value = ViewModel.getValue(comp, `first % second`);
    expect(value).toBe(comp.first % comp.second);
  });

  it(`resolves first < second`, () => {
    const comp = {
      first: 3,
      second: 7
    };
    const value = ViewModel.getValue(comp, `first < second`);
    expect(value).toBe(comp.first < comp.second);
  });

  it(`resolves first <= second`, () => {
    const comp = {
      first: 3,
      second: 3
    };
    const value = ViewModel.getValue(comp, `first <= second`);
    expect(value).toBe(comp.first <= comp.second);
  });

  it(`resolves first > second`, () => {
    const comp = {
      first: 3,
      second: 7
    };
    const value = ViewModel.getValue(comp, `first > second`);
    expect(value).toBe(comp.first > comp.second);
  });

  it(`resolves first >= second`, () => {
    const comp = {
      first: 3,
      second: 3
    };
    const value = ViewModel.getValue(comp, `first >= second`);
    expect(value).toBe(comp.first >= comp.second);
  });

  it(`resolves this.name(this.first, this.second) `, () => {
    const comp = {
      name: (a, b) => comp.first === a && comp.second === b,
      first: "A",
      second: "B"
    };
    const value = ViewModel.getValue(
      comp,
      `this.name(this.first, this.second)`
    );
    expect(value).toBe(comp.name(comp.first, comp.second));
  });

  it(`resolves name.first (name: undefined)`, () => {
    const comp = {
      name: undefined
    };
    const value = ViewModel.getValue(comp, `name.first`);
    expect(value).toBeUndefined();
  });
  it(`resolves name.first (first: undefined)`, () => {
    const comp = {
      name: {
        first: undefined
      }
    };
    const value = ViewModel.getValue(comp, `name.first`);
    expect(value).toBeUndefined();
  });
  it(`resolves undefined`, () => {
    const value = ViewModel.getValue({}, `undefined`);
    expect(value).toBeUndefined();
  });
  it(`resolves name(this)`, () => {
    const comp = {
      name(a) {
        return a === comp;
      }
    };
    const value = ViewModel.getValue(comp, `name(this)`);
    expect(value).toBe(comp.name(comp));
  });
  it(`resolves name(!true)`, () => {
    const comp = {
      name(a) {
        return a;
      }
    };
    const value = ViewModel.getValue(comp, `name(!true)`);
    expect(value).toBe(comp.name(!true));
  });
  it(`creates a property on the component`, () => {
    const comp = {
      [ViewModel.vmId]: 1
    };
    const value = ViewModel.getValue(comp, `name`);
    expect(value).toBe("");
    expect(comp.name()).toBe("");
  });
  it(`can call default property of boolean`, () => {
    const comp = {
      name() {
        return true;
      }
    };
    const value = ViewModel.getValue(comp, `name.toString()`);
    expect(value).toBe("true");
  });
  it(`returns undefined for properties it can't find`, () => {
    const comp = {
      name() {
        return true;
      }
    };
    const value = ViewModel.getValue(comp, `name.one.two`);
    expect(value).toBeUndefined();
  });

  it(`resolves name(first(second))`, () => {
    const comp = {
      name: a => "A" === a,
      first: a => a,
      second: "A"
    };
    const value = ViewModel.getValue(comp, `name(first(second))`);
    expect(value).toBe(comp.name(comp.first(comp.second)));
  });
});
