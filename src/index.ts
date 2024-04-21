import { Effect, effect as _effect, enqueue, nextTick, observedNodes, reactive } from "./reactivity";

let effect = _effect;

export const mount = (root: Element = document.body) => {
  new MutationObserver((muts) =>
    muts.forEach((mut) => {
      mut.removedNodes.forEach(n => observedNodes.delete(n));
      observedNodes.forEach((deps, node) => node.contains(mut.target) && deps.forEach(enqueue));
    })
  ).observe(root, { subtree: true, childList: true });

  return context(root, { $refs: {}, $nextTick: nextTick });
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
        }
        if (arg == "class") {
          value = [...class_ && [class_], ...Object.keys(value).filter(k => value[k])].join(" ");
        }
      }
      // hehe
      if (!value! || !!value === value!!) {
        el.toggleAttribute(arg!, !!value!!);
      } else {
        el.setAttribute(arg!, value);
      }
    });
  },
  prop(get, el, arg) {
    effect(() => el[arg!] = get());
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

const renderComponent = (el: any, scope: any, props: any) => {
  props.$refs = Object.create(scope.$refs);
  el.$data = scope = reactive(props, scope);
  props.$unmount = context(el, scope);
  props.$root = el;
  return el;
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
    el.remove();
    // enqueue halted effects so they can remove themselves from deps
    effects.forEach(eff => (eff.h = true, enqueue(eff)));
    effects.clear();
  };
};

const walk = (el: Element, scope: any) => {
  let expr: string | null;
  const directive = (attr: string) => {
    expr = el.getAttribute(attr);
    el.removeAttribute(attr);
    return expr != null;
  };

  if (directive("x-name")) {
    el.remove();
    (<any> window)[expr!] = (props = {}) =>
      renderComponent((<HTMLTemplateElement> el).content.children[0].cloneNode(true), scope, props);
    return;
  }

  if (directive("x-data")) {
    renderComponent(el, scope, compile(expr!, scope, el)());
    return;
  }

  for (const attr of [...el.attributes]) {
    let directive = attr.name;
    if (!/^(x-|[@:.])/.test(directive)) continue;

    let [name, arg] = kebabToCamel(normalizeDirective(directive)).split(/:(.*)/);
    expr = attr.value || arg;
    if (name in specialDirectives) {
      specialDirectives[name](expr, scope, el, arg);
    } else {
      directives[name](compile(expr, scope, el), el, arg);
    }
    el.removeAttributeNode(attr);
  }

  for (const node of el.children) walk(node, scope);
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
