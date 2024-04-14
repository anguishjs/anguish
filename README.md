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

## Features

- `x-data` for defining data
- `x-ignore` for ignoring elements
- `x-cloak` for hiding elements until processed
- `x-on:event`/`@event` for adding listeners
- `x-bind:prop`/`:prop`
  - `style` objects: `:style="{ fontSize: size + 'px' }"`
  - `class` objects: `class="box" :class="{ warning }"`
- `x-text` for setting `textContent`
- `x-html` for setting `innerHTML`
- `x-effect` for inline reactive code
- `x-init` for running code on mount
- `x-show` for hiding elements
- `x-model` for binding values from input elements
  - only strings for now
- `x-ref` for adding elements to `$refs` in the current scope

Differences from Vue

## Manual initialization

It is also possible to import Anguish.js as an ES6 module, in which it will not automatically mount itself to the body.

``` js
import { mount } from "//unpkg.com/anguishjs?module";

const unmount = mount(document.getElementById("root")); // Calling unmount will stop all directives from running
```
