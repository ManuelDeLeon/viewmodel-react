import ViewModel from "./ViewModel";
import sinon from "sinon";

describe(`ViewModel`, () => {
  let clock;
  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });
  afterAll(() => {
    clock.restore();
  });

  it("has vm prop names", () => {
    expect(ViewModel.vmStateChanged).toBeTruthy();
    expect(ViewModel.vmAutoruns).toBeTruthy();
    expect(ViewModel.vmId).toBeTruthy();
  });

  describe("createProp", () => {
    let called, prop;
    beforeEach(() => {
      called = false;
      prop = ViewModel.createProp("A", {
        vmUpdateState() {
          called = true;
        }
      });
    });
    it(`doesn't update component when created`, () => {
      expect(called).toBe(false);
    });
    it(`has default value`, () => {
      expect(prop()).toBe("A");
    });
    it(`returns updated value`, () => {
      expect(prop("B")).toBe("B");
    });
    it(`updates value`, () => {
      prop("B");
      expect(prop()).toBe("B");
    });
    it(`updates component when updated`, () => {
      prop("B");
      expect(called).toBe(true);
    });
    it(`doesn't update component when updated with same value`, () => {
      prop("A");
      expect(called).toBe(false);
    });
    it(`resets value`, () => {
      prop("B");
      prop.reset();
      expect(prop()).toBe("A");
    });
    it(`has value property`, () => {
      expect(prop.value).toBe("A");
    });

    describe(`autorun`, () => {
      it(`executes the first time it's called`, done => {
        ViewModel.executeAutorun(() => {
          done();
        });
      });
      it(`executes after changing prop`, done => {
        ViewModel.executeAutorun(() => {
          if (prop() === "B") done();
        });
        prop("B");
        clock.tick(10);
      });
      it(`executes autorun once when 2 props change`, done => {
        const prop2 = ViewModel.createProp("X");
        let times = 0;
        ViewModel.executeAutorun(() => {
          prop();
          prop2();
          times++;
        });
        prop("B");
        prop2("Y");
        clock.tick(10);
        clock.next();
        if (times === 2) done();
      });

      it(`clears pending if not modified`, () => {
        ViewModel.executeAutorun(() => {
          prop();
        });
        expect(Object.keys(ViewModel.pendingAutoruns).length).toBe(0);
      });

      it(`clears pending after it executes`, () => {
        ViewModel.executeAutorun(() => {
          prop();
        });
        prop("B");
        clock.tick(10);
        expect(Object.keys(ViewModel.pendingAutoruns).length).toBe(0);
      });
    });
  });

  describe(`delay`, () => {
    it(`runs function after 10ms`, () => {
      let ran = false;
      const func = () => {
        ran = true;
      };
      ViewModel.delay(10, func);
      clock.tick(5);
      expect(ran).toBe(false);
      clock.tick(5);
      expect(ran).toBe(true);
    });
    it(`runs named function after 10ms`, () => {
      let ran = false;
      const func = () => {
        ran = true;
      };
      const name = "X";
      ViewModel.delay(10, name, func);
      clock.tick(5);
      expect(ran).toBe(false);
      clock.tick(5);
      expect(ran).toBe(true);
    });
    it(`delays named function when called again`, () => {
      let ran = false;
      const func = () => {
        ran = true;
      };
      const name = "X";
      ViewModel.delay(10, name, func);
      clock.tick(5);
      expect(ran).toBe(false);
      ViewModel.delay(10, name, func);
      clock.tick(5);
      expect(ran).toBe(false);
      clock.tick(5);
      expect(ran).toBe(true);
    });
  });
});
