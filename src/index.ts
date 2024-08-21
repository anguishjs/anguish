import { Effect, effect, effectTree, enqueue, isRef, nextTick, reactiveProp, ref, unref } from "./reactivity";
import { classOf, consumeSet, createObject, defineProperty, descriptors, func, object } from "./utils";

const globals = { effect, isRef, ref, unref };

export { effect, isRef, ref, unref };

export const mount = (root: HTMLTemplateElement | Element = document.body) => {
  walk(root, globals);
};

export const html = (template: TemplateStringsArray, ...data: any[]) => {
  const props = {} as any;
  const el = document.createElement("div");
  el.innerHTML = String.raw(
    template,
    ...data.map((x, i) => {
      props[`_$${i}`] = x;
      return `_$${i}`;
    }),
  );
  return render(el.children[0], createObject(globals), props);
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
  show(get, el: HTMLElement) {
    effect(() => el.style.display = get() ? "" : "none");
  },
  setup: get => nextTick(get),
  effect: effect,
};

const compile = (expr: string, scope: any, el: Element): () => any =>
  func("$el", `with($el)with(this)return(${expr})`).bind(scope, el);

const render = (el: HTMLTemplateElement | Element, scope: any, props: any) => {
  if (classOf(props) == func) props = props();

  const effects = new Set<Effect>();
  const desc = descriptors(props);
  for (const key in desc) {
    defineProperty(scope, key, desc[key].writable ? reactiveProp(props[key]) : desc[key]);
  }

  effectTree.push(effects);
  walk(el, (el as any).$data = scope);
  effectTree.pop();

  scope.$unmount = () => {
    el.remove();
    consumeSet(effects, e => (e.h = true, enqueue(e)));
  };
  scope.$root = el;
  return el;
};

const clone = (el: HTMLTemplateElement | Element) =>
  <Element> ((<HTMLTemplateElement> el).content?.children[0] ?? el).cloneNode(true);

const walk = (el: Element, scope: any) => {
  let expr: string | null;
  const directive = (attr: string) => {
    expr = el.getAttribute(attr);
    el.removeAttribute(attr);
    return expr != null;
  };

  if (directive("x-name")) {
    el.remove();
    scope[expr!] = (props: any) => render(clone(el), createObject(scope), props ?? {});
    return;
  }

  if (directive("x-data")) {
    render(el, scope = createObject(scope), compile(expr! || "{}", scope, el)());
    return;
  }

  for (const attr of [...el.attributes]) {
    let directive = attr.name;
    if (!/^x-|^[@:.]/.test(directive)) continue;

    el.removeAttribute(directive);
    let [name, arg] = kebabToCamel(normalizeDirective(directive)).split(/:(.*)/);
    let expr = attr.value || arg;
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
