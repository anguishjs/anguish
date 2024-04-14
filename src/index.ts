import { effect, effects, nextTick, reactive, subscope } from "./reactivity";

export const mount = (root: Element = document.body) => {
  const scope = reactive({
    $refs: {},
    $nextTick: nextTick,
  });

  walk(root, scope);

  return () => effects.forEach(eff => eff.h = true);
};

const listen = (el: Element, event: string, fn: (e: any) => void) => el.addEventListener(event, fn);

const specialDirectives: Record<string, (expr: string, scope: any, el: any, arg?: string) => void> = {
  ref(expr, scope, el) {
    scope.$refs[expr] = el;
  },
  on(expr, scope, el, arg) {
    listen(el, arg!, compile(`$event=>{${expr}}`, scope, el)());
  },
  model(expr, scope, el: HTMLInputElement) {
    const [ev, attr] = el.type == "checkbox"
      ? ["change", "checked"] as const
      : ["input", "value"] as const;

    listen(el, ev, () => scope[expr] = el[attr]);
    // @ts-ignore ???
    effect(() => el[attr] = scope[expr]);
  },
};

const directives: Record<string, (get: () => any, el: any, arg?: string) => void> = {
  bind(get, el: HTMLElement, arg) {
    const class_ = el.className;
    effect(() => {
      let value = get();
      if (typeof value != "string") {
        if (arg == "style") {
          for (const prop in value) {
            if (/^--/.test(prop)) {
              el.style.setProperty(prop, value);
            } else {
              el.style[prop as any] = value;
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
  text(get, el: HTMLElement) {
    effect(() => el.textContent = get());
  },
  html(get, el: HTMLElement) {
    effect(() => el.innerHTML = get());
  },
  effect: effect,
  init: nextTick,
  show(get, el: HTMLElement) {
    const display = el.style.display;
    effect(() => el.style.display = get() ? "none" : display);
  },
};

const compile = (expr: string, scope: any, el: Element): () => any =>
  Function("$data", "$el", `with($data)return ${expr}`).bind(null, scope, el);

const walk = (el: Element, scope: any) => {
  let expr: string | null;
  const directive = (attr: string) => {
    expr = el.getAttribute(attr);
    if (expr != null) {
      el.removeAttribute(attr);
      return true;
    } else {
      return false;
    }
  };

  if (directive("x-ignore")) return;

  directive("x-cloak");

  if (directive("x-data")) {
    scope = subscope({ ...compile(expr!, scope, el)(), $refs: Object.create(scope.$refs) }, scope);
  }

  for (const attr of [...el.attributes]) {
    const directive = attr.name;
    const expr = attr.value;
    if (!/^(x-|@|:)/.test(directive)) continue;

    const [name, arg] = normalizeDirective(directive).split(/:(?!.*:)/);
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
  return dir[0] == "@"
    ? "on:" + dir.slice(1)
    : dir[0] == ":"
    ? "bind:" + dir.slice(1)
    : dir.slice(2);
};

declare const BUILD: "iife" | "esm";

if (typeof BUILD == "undefined" || BUILD == "iife") {
  mount();
}
