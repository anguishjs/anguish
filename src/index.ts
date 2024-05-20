import { Effect, effect, effectTree, enqueue, initScope, nextTick, observedNodes, reactiveProp } from "./reactivity";
import { classOf, consumeSet, createObject, defineProperty, object } from "./utils";

export const mount = (root: Element = document.body) => {
  new MutationObserver((muts) =>
    muts.forEach(mut => {
      mut.removedNodes.forEach(n => observedNodes.delete(n));
      observedNodes.forEach((deps, node) => node.contains(mut.target) && deps.forEach(enqueue));
    })
  ).observe(root, { subtree: true, childList: true });

  walk(root, {
    effect,
    $unmount() {
      this.$root.remove();
      consumeSet<Effect>(this[EFFECTS], e => (e.h = true, enqueue(e)));
    },
  });
};

const kebabToCamel = (str: string) => str.replace(/-./, c => c[1].toUpperCase());
const listen = "addEventListener";

const specialDirectives: Record<string, (expr: string, scope: any, el: any, arg?: string) => void> = {
  ref(expr, scope, el) {
    defineProperty(scope, expr, reactiveProp(el));
  },
  on(expr, scope, el, arg) {
    el[listen](arg!, compile(`$event=>{${/^[\w$_.]+$/.test(expr) ? expr + "($event)" : expr}}`, scope, el)());
  },
  model(expr, scope, el) {
    const attr = el.type == "checkbox" ? "checked" : "value";

    el[listen]("input", () => scope[expr] = el[attr]);
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
            if (prop[0] == "-") {
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
  Function("$data", "$el", `with($el)with($data)return(${expr})`).bind(scope, scope, el);

const EFFECTS = Symbol();
const renderComponent = (el: any, scope: any) => {
  effectTree.push(scope[EFFECTS] = new Set<Effect>());
  walk(el, el.$data = scope);
  effectTree.pop();
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
    scope[expr!] = (props = {}) => {
      initScope(scope = createObject(scope), props);
      return renderComponent((<HTMLTemplateElement> el).content.children[0].cloneNode(true), scope);
    };
    return;
  }

  if (directive("x-data")) {
    initScope(scope = createObject(scope), compile(expr! ?? "{}", scope, el)());
    renderComponent(el, scope);
    return;
  }

  for (const attr of [...el.attributes]) {
    let directive = attr.name;
    if (!/^x-|^[@:.]/.test(directive)) continue;

    el.removeAttribute(directive);
    let [name, arg] = kebabToCamel(normalizeDirective(directive)).split(/:(.*)/);
    expr = attr.value || arg;
    if (name in specialDirectives) {
      specialDirectives[name](expr, scope, el, arg);
    } else {
      directives[name](compile(expr, scope, el), el, arg);
    }
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
