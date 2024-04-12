# Anguish.js

The Regressive JavaScript Framework.

## What?

This is a proof of concept for a Vue-like markup-only framework like [Alpine.js](https://alpinejs.dev/) or
[petite-vue](https://github.com/vuejs/petite-vue). It aims for an even smaller bundle size, being currently at 1.7kb
(900 bytes gzipped!) with most of the core implemented.

## Usage

Anguish.js does not require any compilation:

``` html
<script src="//unpkg.com/anguishjs" defer></script>

<div v-scope="{ count: 0 }">
  <div v-text="count"></div>
  <button @click="count++">Click me!</button>
</div>
```

- `v-scope` defines data for the component…

  Variables will be available within the element, and scopes can be nested.

- `v-text` sets the inner text of the element…

  By default, everything is reactive: the text will be re-evaluated every time `count` changes.

- `@click` listens to click events…

  Likewise, whenever the event is fired, `count` is increased by one.

Easy as!

## Features

- `v-scope` for defining data
- `v-pre` for ignoring elements
- `v-cloak` for hiding elements until processed
- `v-on:event`/`@event` for adding listeners
- `v-bind:prop`/`:prop`
  - regular attributes
  - `class` object: `:class="{ fontSize: size + 'px' }"`
- `v-text` for setting `textContent`
- `v-html` for setting `innerHTML`
- `v-effect` for inline reactive code
- `v-init` for running code on mount
- `v-show` for hiding elements
- `v-model` for binding values from input elements
  - only strings for now
- `ref` for adding elements to `$refs`

Differences from Vue

- `:ref`. In Anguish, `ref` is not a dynamic property. I honestly don’t know in what usecase you might need to
  dynamically rename a ref, but it makes it a bit more complicated to implement.

## TODO:

- `v-model` for radio/select elements
- conditionals and loops
