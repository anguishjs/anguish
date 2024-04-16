import { Effect, effect as _effect, enqueue, nextTick, reactive } from "./reactivity";

let effect = _effect;

export const mount = (root: Element = document.body) => {
  return context(root, reactive({ $refs: {}, $nextTick: nextTick }));
};

const kebabToCamel = (str: string) => str.replace(/-./, c => c[1].toUpperCase());
const listen = (el: Element, event: string, fn: (e: any) => void) => el.addEventListener(event, fn);

const specialDirectives: Record<string, (expr: string, scope: any, el: any, arg?: string) => void> = {
  ref(expr, scope, el) {
    scope.$refs[expr] = el;
  },
  on(expr, scope, el, arg) {
    listen(el, arg!, compile(`$event=>{${expr}}`, scope, el)());
  },
  model(expr, scope, el: HTMLInputElement) {
    const attr = el.type == "checkbox"
      ? "checked"
      : "value";

    listen(el, "input", () => scope[expr] = el[attr]);
    // @ts-ignore ???
    effect(() => el[attr] = scope[expr]);
  },
  name(expr, scope, el: HTMLTemplateElement) {
    el.remove();
    (window as any)[expr] = (props = {}) =>
      // @ts-ignore yes it does exist
      component(el.content.cloneNode(true).firstElementChild, props, scope);
  },
};

const directives: Record<string, (get: () => any, el: any, arg?: string) => void> = {
  bind(get, el: HTMLElement, arg) {
    const class_ = el.className;
    effect(() => {
      let value = get();
      if (typeof value == "boolean") {
        el.toggleAttribute(arg!, value);
        return;
      }
      if (typeof value == "object") {
        if (arg == "style") {
          for (const prop in value) {
            if (/^--/.test(prop)) {
              el.style.setProperty(prop, value[prop]);
            } else {
              el.style[prop as any] = value[prop];
            }
          }
          return;
        } else if (arg == "class") {
          value = class_ + " " + Object.keys(value).filter(k => value[k]).join(" ");
        }
      }
      el.setAttribute(arg!, value);
    });
  },
  prop(get, el: HTMLElement, arg) {
    // @ts-ignore
    effect(() => el[arg] = get());
  },
  text(get, el: HTMLElement) {
    effect(() => el.textContent = get());
  },
  html(get, el: HTMLElement) {
    effect(() => el.innerHTML = get());
  },
  effect: (get) => effect(get),
  init: nextTick,
  show(get, el: HTMLElement) {
    effect(() => el.style.display = get() ? "" : "none");
  },
  cloak() {},
};

const compile = (expr: string, scope: any, el: Element): () => any =>
  Function("$data", "$el", `with($data)return ${expr}`).bind(null, scope, el);

const component = (el: Element, props: any, scope: any) => {
  scope = reactive(props, scope);
  scope.$refs = Object.create(scope.$refs);
  scope.$root = el;
  scope.$unmount = context(el, scope);
  return scope;
};

const context = (el: Element, scope: any) => {
  const effects = new Set<Effect>();
  const eff = effect;
  effect = (fn) => {
    eff(fn);
    effects.add(fn.e!);
  };
  walk(el, scope);
  effect = eff;

  return () => {
    effects.forEach(eff => (eff.h = true, enqueue(eff)));
    el.remove();
  };
};

const walk = (el: Element, scope: any) => {
  let expr: string | null;
  const directive = (attr: string) => {
    expr = el.getAttribute(attr);
    el.removeAttribute(attr);
    return expr != null;
  };

  if (directive("x-if")) {
    const get = compile(expr!, scope, el);
    const anchor = new Text();
    let clone: Element;
    let cleanup: () => void;
    el.replaceWith(anchor);
    effect(() => {
      if (get()) {
        anchor.after(clone = el.cloneNode(true) as Element);
        cleanup = context(clone, scope);
      } else {
        cleanup?.();
      }
    });

    return;
  }

  if (directive("x-for")) {
    const [terms, arr] = expr!.split(" in ");
    const [term, idx] = terms.split(",");
    const get = compile(arr, scope, el);
    const anchor = new Text();
    const cleanups = <(() => void)[]> [];
    el.replaceWith(anchor);
    effect(() => {
      const value = [...get()];
      const diff = cleanups.length - value.length;
      if (diff < 0) {
        value.slice(diff).forEach((v, i) => {
          const clone = el.cloneNode(true) as Element;
          anchor.before(clone);
          cleanups.push(context(clone, reactive({ [term]: v, ...idx && { [idx]: i } }, scope)));
        });
      } else if (diff > 0) {
        cleanups.splice(value.length).forEach(f => f());
      }
    });
    return;
  }

  if (directive("x-data")) {
    component(el, compile(expr!, scope, el)(), scope);
    return;
  }

  for (const attr of [...el.attributes]) {
    let directive = attr.name;
    let expr = attr.value;
    if (!/^(x-|[@:.])/.test(directive)) continue;

    let [name, arg] = kebabToCamel(normalizeDirective(directive)).split(/:(.*)/);
    expr ||= arg;
    if (name in specialDirectives) {
      specialDirectives[name](expr, scope, el, arg);
    } else {
      directives[name](compile(expr, scope, el), el, arg);
    }
    el.removeAttributeNode(attr);
  }

  for (const node of el.children) {
    walk(node, scope);
  }
};

const normalizeDirective = (dir: string) => {
  if (dir[0] == "@") return "on:" + dir.slice(1);
  if (dir[0] == ".") return "prop:" + dir.slice(1);
  if (dir[0] == ":") return "bind" + dir;
  return dir.slice(2);
};

declare const BUILD: "iife" | "esm";

if (typeof BUILD == "undefined" || BUILD == "iife") {
  mount();
}
