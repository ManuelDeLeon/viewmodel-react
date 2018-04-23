# 3.1.1
* Set proper context (this) for share and mixin

# 3.1.0
* Add ViewModel.data() & .load(data) with the state of the entire app.

# 3.0.0
* shared properties keep the initial value when a component declares it. It makes more sense for the initial value of a shared property to be defined in the ViewModel.share

# 2.4.1
* Preset validations (min, max, equal, notEqual, between, notBetween) now coerce values.

# 2.4.0
* Add Inferno compatibility. See [Inferno](https://viewmodel.org/#BasicsInferno) for more information.

# 2.3.0
* Add component.child shortcut

# 2.2.1
* Reactivity now works with nested objects in properties.

# 2.2.0
* Add validating and validatingMessage to properties. A component will be invalid if it has a pending async validation. The validation message will be added to the invalid messages collection if it's pending.

# 2.1.2
* Fix throttle binding

# 2.1.1
* Fix issue with Meteor + shared

# 2.1.0
* Add `esc` binding

# 2.0.2
* Shortcircuit logical operators.

# 2.0.1
* Handle references to components and elements better.

# 2.0.0
* Added the [ref binding](https://viewmodel.org/#BindingsRef) for referencing elements and components. React's ref/refs will still work but it's on life support and likely to be deprecated by React in the future.

# 1.0.3
* Guard against window undefined

# 1.0.2
* Don't use window if it's not defined (fix for SSR)

# 1.0.1
* Fix React Native

# 1.0.0
* Hello World!
