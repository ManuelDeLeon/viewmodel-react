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