import { effect, effects, nextTick, reactive } from "./reactivity";

export const mount = (root: Element = document.body) => {
  walk(root, reactive({ $refs: {}, $nextTick: nextTick }));

  return () => {
    effects.forEach(eff => eff.h = true);
    effects.length = 0;
  };
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
  effect: effect,
  init: nextTick,
  show(get, el: HTMLElement) {
    effect(() => el.style.display = get() ? "none" : "");
  },
  cloak() {},
};

const compile = (expr: string, scope: any, el: Element): () => any =>
  Function("$data", "$el", `with($data)return ${expr}`).bind(null, scope, el);

const walk = (el: Element, scope: any) => {
  const data = el.getAttribute("x-data");

  if (data != null) {
    el.removeAttribute("x-data");
    scope = reactive(compile(data, scope, el)(), scope);
    scope.$refs = Object.create(scope.$refs);
    scope.$root = el;
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
