var ViewModel = require("../dist/viewmodel");
describe("share", () => {
	beforeEach(()=>{
		ViewModel.share({ house: { address: "123" } });
	})
	it("adds property to component", () => {
    var vm = ViewModel.loadComponent({ share: "house" });
    var result = vm.address();
    expect(result).toBe("123");
	});
	it("modifying property in one component modifies the same prop in another comp", () => {
		var vm1 = ViewModel.loadComponent({ share: "house" });
		var vm2 = ViewModel.loadComponent({ share: "house" });
    vm1.address("ABC");
    expect(vm1.address()).toBe(vm2.address());
  });
	it("doesn't change shared property default value", () => {
		var vm = ViewModel.loadComponent({ share: "house", address: "XYZ" });
		var result = vm.address();
		expect(result).toBe("123");		
	})
})

describe("mixin", () => {
	beforeEach(() => {
		ViewModel.mixin({ house: { address: "ABC" } });
	})
  it("adds property to component", () => {
    var vm = ViewModel.loadComponent({ mixin: "house" });
    var result = vm.address();
    expect(result).toBe("ABC");
  });
  it("modifying property in one component doesn't modify the same prop in another comp", () => {
    var vm1 = ViewModel.loadComponent({ mixin: "house" });
    var vm2 = ViewModel.loadComponent({ mixin: "house" });
    vm1.address("123");
		expect(vm1.address()).toBe("123");
		expect(vm2.address()).toBe("ABC");
  });
  it("changes mixin property default value", () => {
    var vm = ViewModel.loadComponent({ mixin: "house", address: "XYZ" });
    var result = vm.address();
    expect(result).toBe("XYZ");
  });
});

describe("data/load", ()=> {
    beforeEach(function() {
      jest.useFakeTimers();
    });
  it("retrieves and loads state", () => {
    var vm1 = ViewModel.loadComponent({ name: "Alan" });
    ViewModel.rootComponents = [vm1];
    var data = ViewModel.data();
    vm1.name("Brito");
    ViewModel.load(data);
    jest.runAllTimers();
    expect(vm1.name()).toBe("Alan");
  })
});

describe("getPathToRoot", () => {

  it("returns root if it doesn't have a parent", () => {
    var vm1 = ViewModel.loadComponent({ name: "Alan" });
    var path = ViewModel.getPathToRoot(vm1);
    expect(path).toBe("TestComponent/");
  });
});

describe("Properties", () => {

  describe("beforeUpdate", () => {
    it("sets component as this/context", () => {
      var context = null;
      var newValue = "";
      var oldValue = "";
      var vm = ViewModel.loadComponent({ name: ViewModel.property.string.default("B").beforeUpdate(function(nextValue) {
        context = this;
        newValue = nextValue;
        oldValue = this.name();
      })});
      expect(vm.vmChanged).toBeFalsy();
      vm.name("A");
      expect(vm.vmChanged).toBe(true);
      expect(context).toBe(vm);
      expect(newValue).toBe("A");
      expect(oldValue).toBe("B");
    });

    it("sets context from direct share", () => {
      var context = null;
      var newValue = "";
      var oldValue = "";

      ViewModel.share({
        bfu: {
          name: ViewModel.property.string
            .default("B")
            .beforeUpdate(function(nextValue) {
              context = this;
              newValue = nextValue;
              oldValue = this.name();
            })
        }
      });
            
            var vm = ViewModel.loadComponent({
              share: 'bfu'
            });
            expect(vm.vmChanged).toBeFalsy();
            vm.name("A");
            expect(vm.vmChanged).toBe(true);
            expect(context).toBe(ViewModel.shared['bfu']);
            expect(newValue).toBe("A");
            expect(oldValue).toBe("B");
    })

        it("sets context from scoped share", () => {
          var context = null;
          var newValue = "";
          var oldValue = "";

          ViewModel.share({
            bfu1: {
              name: ViewModel.property.string
                .default("B")
                .beforeUpdate(function(nextValue) {
                  context = this;
                  newValue = nextValue;
                  oldValue = this.name();
                })
            }
          });

          var vm = ViewModel.loadComponent({ share: { foo: "bfu1" } });
          expect(vm.vmChanged).toBeFalsy();
          vm.foo.name("A");
          expect(vm.vmChanged).toBe(true);
          expect(context).toBe(ViewModel.shared["bfu1"]);
          expect(newValue).toBe("A");
          expect(oldValue).toBe("B");
        });

        it("sets context from direct mixin", () => {
          var context = null;
          var newValue = "";
          var oldValue = "";

          ViewModel.mixin({
            bfu: {
              name: ViewModel.property.string
                .default("B")
                .beforeUpdate(function(nextValue) {
                  context = this;
                  newValue = nextValue;
                  oldValue = this.name();
                })
            }
          });

          var vm = ViewModel.loadComponent({ mixin: "bfu" });
          expect(vm.vmChanged).toBeFalsy();
          vm.name("A");
          expect(vm.vmChanged).toBe(true);
          expect(context).toBe(vm);
          expect(newValue).toBe("A");
          expect(oldValue).toBe("B");
        });

        it("sets context from scoped mixin", () => {
          var newValue = "";
          var oldValue = "";

          ViewModel.mixin({
            bfu1: {
              name: ViewModel.property.string
                .default("B")
                .beforeUpdate(function(nextValue) {
                  newValue = nextValue;
                  oldValue = this.name();
                })
            }
          });

          var vm = ViewModel.loadComponent({
            mixin: { foo: "bfu1" }
          });
          expect(vm.vmChanged).toBeFalsy();
          vm.foo.name("A");
          expect(vm.vmChanged).toBe(true);
          expect(newValue).toBe("A");
          expect(oldValue).toBe("B");
        });
  });
});