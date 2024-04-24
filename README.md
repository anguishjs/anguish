# Anguish.js

Anguish is a **2.4kB** (**1.2kB** gzipped, fyi) reactive framework, similar to Vue and Alpine. No VDOMs, and no
compilation needed!

``` html
<script src="//unpkg.com/anguishjs" defer></script>

<div x-data="{ count: 0 }">
  <button @click="count++">Click me!</button>
  <span x-text="count"></span>
</div>
```

- `x-data` defines the component’s data…
- `@click` updates `count` every click…
- `x-text` sets the `span`’s text…

Easy as! Just add the script tag in your `<head>`, and you can use components anywhere in the markup.

## Features

- 12 directives implemented: `x-data`, `x-name`, `x-text`, `x-html`, `x-show`, `x-bind`/`:bind`, `x-prop`/`.prop`,
  `x-on`/`@event`, `x-model`, `x-ref`, `x-init` & `x-effect`

## Using components

As shown, `x-data` creates an inline component with the given scope. It’ll be rendered exactly where it is (rendering is
a bit misleading, everything is done in-place), and you can nest it as many times as you'd like.

It's also not necessary to use an object literal, if things get too clumsy, you can move your data to a script:

```html
<script>
const myApp = () => ({
  size: 36,
  topText: "Top text",
  bottomText: "Bottom text",
});
</script>

<main x-data="myApp()">...</main>
```

There are no limitations on which types can be used, and you can even have functions and getters:

```html
<div x-data="{
  count: 0,
  increment() {
    this.count++
  },
  get square() {
    return this.count ** 2
  },
}">
  ...
</div>
```

Anguish is purely DOM-based. As such, you might find it weird that you don’t have something like an `x-for`, however,
components render to simple elements which you can use!

``` html
<!-- this is a component! -->
<template x-name="item">
  <li><span x-text="title"></span></li>
</template>

<input @change="$refs.list.append(item({ title: value }))" placeholder="Add an item...">
<ul x-ref="list"></ul>
```

Anguish also features DOM reactivity – code that uses elements inside `$refs` will automatically update when components
are added inside it. You can access the component’s data through the `$data` property, which contains everything in it’s
scope.

Note that removing an element will not unmount the component. For that, `$unmount()` is available in the component’s
scope.
