import { Effect, effect, effectTree, enqueue, initScope, nextTick, observedNodes } from "./reactivity";
import { classOf, createObject, object } from "./utils";

export const mount = (root: Element = document.body) => {
  new MutationObserver((muts) =>
    muts.forEach((mut) => {
      mut.removedNodes.forEach(n => observedNodes.delete(n));
      observedNodes.forEach((deps, node) => node.contains(mut.target) && deps.forEach(enqueue));
    })
  ).observe(root, { subtree: true, childList: true });

  walk(root, { $refs: {} });
};

const kebabToCamel = (str: string) => str.replace(/-./, c => c[1].toUpperCase());
const listen = (el: Element, event: string, fn: (e: any) => void) => el.addEventListener(event, fn);

const specialDirectives: Record<string, (expr: string, scope: any, el: any, arg?: string) => void> = {
  ref(expr, scope, el) {
    scope.$refs[expr] = el;
  },
  on(expr, scope, el, arg) {
    listen(el, arg!, compile(/^[\w$_.]+$/.test(expr) ? expr : `$event=>{${expr}}`, scope, el)());
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
      if (classOf(value) == object) {
        if (arg == "style") {
          for (const prop in value) {
            if (/-/.test(prop)) {
              el[arg].setProperty(prop, value[prop]);
            } else {
              el[arg][<any> prop] = value[prop];
            }
          }
          return;
        }
        if (arg == "class") {
          value = [...class_ && [class_], ...object.keys(value).filter(k => value[k])].join(" ");
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
  effect: effect,
  init: get => nextTick(get),
  show(get, el: HTMLElement) {
    effect(() => el.style.display = get() ? "" : "none");
  },
};

const compile = (expr: string, scope: any, el: Element): () => any =>
  Function("$data", "$el", `with($el)with($data)return ${expr}`).bind(null, scope, el);

const renderComponent = (el: any, scope: any, effects = new Set<Effect>()) => {
  effectTree.push(effects);
  walk(el, el.$data = scope);
  effectTree.pop();
  scope.$unmount = () => {
    el.remove();
    // enqueue halted effects so they can remove themselves from deps
    effects.forEach(eff => (eff.h = true, enqueue(eff)));
    effects.clear();
  };
  scope.$root = el;
  return el;
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
    (<any> window)[expr!] = (props = {}) => {
      initScope(scope = createObject(scope), props);
      return renderComponent((<HTMLTemplateElement> el).content.children[0].cloneNode(true), scope);
    };
    return;
  }

  if (directive("x-data")) {
    initScope(scope = createObject(scope), compile(expr!, scope, el)());
    renderComponent(el, scope);
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
