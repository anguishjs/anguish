import { effect, nextTick, reactive } from "./reactivity";

type Directive<T extends Element> = (
  get: () => any,
  el: T,
  arg: string | undefined,
  expr: string,
  scope: any,
) => void;

const listen = (el: Element, event: string, fn: (e: any) => void) => el.addEventListener(event, fn);

const directives: Record<string, Directive<any>> = {
  bind: (get, el: HTMLElement, arg) => {
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
  on: (_, el: HTMLElement, arg, expr, scope) => listen(el, arg!, closure(`$event=>{${expr}}`, scope, el)()),
  text: (get, el: HTMLElement) => effect(() => el.textContent = get()),
  html: (get, el: HTMLElement) => effect(() => el.innerHTML = get()),
  effect: effect,
  init: nextTick,
  show: (get, el: HTMLElement) => {
    const display = el.style.display;
    effect(() => el.style.display = get() ? "none" : display);
  },
  model: (get, el: HTMLInputElement, _, expr, scope) => {
    const assign = closure(`v=>${expr}=v`, scope, el)();

    if (el.type == "checkbox") {
      listen(el, "change", () => assign(el.value));
      effect(() => el.value = get());
    } else {
      listen(el, "input", () => {
          return assign(el.value);
      });
      effect(() => el.value = get());
    }
  },
};

const closure = (expr: string, scope: any, el: Element): () => any =>
  Function("$data", "$el", `with($data)return ${expr}`).bind(null, scope, el);

const walk = (el: Element, scope: any) => {
  let expr: string | null = null;
  const directive = (attr: string) => {
    expr = el.getAttribute(attr);
    if (expr != null) {
      el.removeAttribute(attr);
      return true;
    } else {
      return false;
    }
  };

  if (directive("v-pre")) return;

  directive("v-cloak");

  if (directive("v-scope")) {
    scope = reactive(closure(expr!, scope, el)(), scope);
  }

  if (directive("ref")) {
    scope.$refs[expr!] = el;
  }

  const dirs = [...el.attributes].filter(attr => /^(v-|@|:)/.test(attr.name));
  for (const attr of dirs) {
    let directive = attr.name;
    let expr = attr.value;
    if (directive[0] == "@") directive = "on:" + directive.slice(1);
    else if (directive[0] == ":") directive = "bind:" + directive.slice(1);
    else directive = directive.slice(2);

    const match = directive.split(/:(?!.*:)/);
    directives[match[0]](closure(expr, scope, el), el, match[1], expr, scope);
    el.removeAttributeNode(attr);
  }

  for (const node of el.children) {
    walk(node, scope);
  }
};

const roots = [...document.querySelectorAll("[v-scope]")]
  .filter(root => !root.matches("[v-scope] [v-scope]"));

const scope = reactive({
  $refs: {},
  $nextTick: nextTick,
});

for (const r of roots) walk(r, scope);
