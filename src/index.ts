import { effect, reactive } from "./reactivity";

type Directive<T extends Element> = (expr: string, scope: any, element: T, arg?: string) => void;

const directives: Record<string, Directive<any>> = {
  bind: (expr, scope, el, arg) => {
    const get = closure(expr, scope, el);
    effect(() => {
      let value = get();
      if (arg == "class" && typeof value != "string") {
        value = Object.entries(value).flatMap(([k, v]) => v ? [k] : []).join(" ");
      }

      el.setAttribute(arg, value);
    });
  },
  on: (expr, scope, el, arg) => el.addEventListener(arg, closure(`$event=>{${expr}}`, scope, el)()),
  text: (expr, scope, el) => {
    const get = closure(expr, scope, el);
    effect(() => el.textContent = get());
  },
  effect: (expr, scope, el) => {
    const run = closure(expr, scope, el);
    effect(() => run());
  },
};

const closure = (expr: string, scope: any, el: Element) =>
  new Function("$data", "$el", `with($data)return(${expr})`).bind(null, scope, el);

const walk = (el: Element, scope: any) => {
  let expr: string | null = null;
  const directive = (attr: string) => {
    expr = el.getAttribute(attr);
    if (expr != null) el.removeAttribute(attr);
  };

  if (directive("v-pre"), expr != null) return;

  directive("v-cloak");

  if (directive("v-scope"), expr != null) {
    scope = reactive(closure(expr, scope, el)());
  }

  const dirs = [...el.attributes].filter(attr => /^(v-|@|:)/.test(attr.name));
  for (const attr of dirs) {
    let directive = attr.name;
    if (directive[0] == "@") directive = "v-on:" + directive.slice(1);
    if (directive[0] == ":") directive = "v-bind:" + directive.slice(1);

    const match = /^v-(\w+)(:.*)?$/.exec(directive)!;
    directives[match[1]](attr.value, scope, el, match[2]?.slice(1));
    el.removeAttributeNode(attr);
  }

  for (const node of el.children) {
    walk(node, scope);
  }
};

const scope = reactive({});
const roots = [...document.querySelectorAll("[v-scope]")]
  .filter(root => !root.matches("[v-scope] [v-scope]"));

for (const r of roots) walk(r, scope);
