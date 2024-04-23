# Anguish.js

The Regressive JavaScript Framework.

## What?

This is a proof of concept for a markup-only framework like [Alpine.js](https://alpinejs.dev/) or
[petite-vue](https://github.com/vuejs/petite-vue). It aims for an even smaller bundle size, being currently at ~2kb (1kb
gzipped!) with most of the core implemented.

## Usage

Anguish.js does not require any compilation:

``` html
<script src="//unpkg.com/anguishjs" defer></script>

<div x-data="{ count: 0 }">
  <div x-text="count"></div>
  <button @click="count++">Click me!</button>
</div>
```

- `x-data` defines data for the component…

  Variables will be available within the element, and scopes can be nested.

- `x-text` sets the inner text of the element…

  By default, everything is reactive: the text will be re-evaluated every time `count` changes.

- `@click` listens to click events…

  Likewise, whenever the event is fired, `count` is increased by one.

Easy as!

## Directives and properties

As you’ve learned, special attributes—called directives—are used for defining our components. Let’s see a couple more…

### `x-data`, `x-name` and components

`x-data` defines the reactive data for a component. Each of the object’s keys will be available in the component’s
elements as variables. This object can contain any type of data, and nested objects and arrays will also be reactive.

You do not need to use an object literal, if things get too big, you might want to put it in a script:

``` html
<script>
function myComponent() {
  return {
    size: 36,
    topText: "Top text",
    bottomText: "Bottom text",
  };
}
</script>

<div x-data="myComponent()">...</div>
```

Nesting data works pretty naturally:

``` html
<div x-data="{ foo: 'bar' }">
  <div x-data="{ foo: 'nested' }">
    <div x-text="foo"><!-- 'nested' --></div>
  </div>
  <div x-text="foo"><!-- 'bar' --></div>
</div>
```

### `x-text` and `x-html`

`x-text` and `x-html` set the `textContent` and `innerHTML` of an element, respectively:

``` html
<div x-data="{ text: '<b>Boo!</b>' }">
  <span x-text="text"></span> <!-- This will say "<b>Boo!</b>" -->

  <span x-html="text"></span> <!-- This will say "Boo!" Scary.. -->
</div>
```

### `x-show`

`x-show` hides an element based on it’s value:

``` html
<div x-data="{ open: false }">
  <button @click="open = !open">Open</button>
  <div x-show="open">
    Hello!
  </div>
</div>
```

Since directives are completely removed when everything is rendered, you can use this to hide elements which shouldnt
show up initially:

``` html
<style>[x-show] { display: none; }</style>
```

### `$el` and `$root`

`$el` and `$root` are special variables usable in directives. `$el` refers to the current element, and `$root` refers to
the component’s root (the nearest `x-data`).

### `x-bind`, `x-prop` and attributes

`x-bind:attr` and it’s shorthand `:attr` can be used to set attributes to the value of an expression:

``` html
<img x-bind:src="'/some/path/' + myfile">
<!-- or... -->
<img :src="myurl">
<!-- the expression may also be omitted for an attribute of same name -->
<img :src>
```

classes and styles can also be objects:

``` html
<div class="box" :class="{ warning: true }"></div>
<!-- renders -->
<div class="box warning"></div>

<div :style="{ fontSize: size + 'px' }"></div>
<!-- renders -->
<div style="font-size: 36px"></div>
```

`x-prop:prop` (abbreviated `.prop`) is similar to `x-bind`, but instead of setting a DOM attribute, it’ll set a property
in the actual object:

``` html
<div .inner-text="'you should probably use x-text!'"></div>
```

Since HTML attributes are case-insensitive, kebab-case attributes will be automatically converted to camelCase:

``` html
<svg :view-box="..."></svg>
<!-- renders -->
<svg viewBox="..."></svg>
```

### `x-on` and events

`x-on:event`, or it’s shorthand `@event` can be used to listen for DOM events on the current element:

``` html
<button @click="alert('Hi there!')">Click me</button>
```

### `x-model` and inputs

`x-model` can be used as a shorthand for binding to an input’s value, and also listening to changes:

``` html
<div x-data="{ text: 'Hello!' }">
  <input x-model="text">
  <!-- This div will change to what you input -->
  <div x-text="text"></div>
</div>
```

### `x-ref` and `$refs`

Refs work very much like element IDs, except that they are bound to the component’s scope. This is particularly useful
to avoid name conflicts when using a template system for your HTMl.

``` html
<!-- Hide the ugly file input! -->
<input x-ref="file" type="file" hidden>
<button @click="$refs.file.click()">Choose file</button>
```

### `x-init`

`x-init` can be used to run a chunk of code after the element has been mounted:

``` html
<div x-init="fetch('...').then(...)"></div>
```

### `x-effect`

`x-effect` defines reactive statements:

``` html
<div x-data="{ count: 0 }">
  <div x-effect="console.log('count is', count)"></div>
  <button @click="count++">++</button>
</div>
```

`effect` is the basis of most directives. For example, one might implement `x-text` by using
`x-effect="$el.textContent = value"`

## Manual initialization

It is also possible to import Anguish.js as an ES6 module, in which it will not automatically mount itself to the body.

``` js
import { mount } from "https://esm.sh/anguishjs";

mount(document.getElementById("root"));
```

For large pages, this can also be more efficient if only a small part of it uses Anguish.
