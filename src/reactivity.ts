import { classOf, object, reflect, setProperty } from "./utils";

export type Effect = { (): void; d: Set<Set<Effect>>; h?: boolean };

export const observedNodes = new Map<Node, Set<Effect>>();

const proxy = (
  obj: any,
  get: (t: any, k: string) => any,
  set: (t: any, k: string, v: any) => boolean,
  has?: (t: any, k: string) => boolean,
) => new Proxy(obj, { get, set, has });

const dependOn = (deps: Set<Effect>, value: any) => {
  if (classOf(value) == object || classOf(value) == Array) {
    value = proxy(
      value,
      (obj, k) => read(deps, obj, k, value),
      (obj, k, v) => write(deps, obj, k, v, value),
    );
  } else if (value instanceof Node) {
    observedNodes.set(value, deps);
  }
  return value;
};

const read = (deps: Set<Effect>, target: any, key: keyof any, recv: any) => {
  if (deps) running?.d.add(deps.add(running));
  return reflect.get(target, key, recv);
};

const write = (deps: Set<Effect>, target: any, key: keyof any, value: any, recv: any) => {
  deps.forEach(enqueue);
  return setProperty(target, key, dependOn(deps, value), recv);
};

const queue = new Set<Effect>();
export const enqueue = (eff: Effect) => {
  if (!queue.size) {
    nextTick(() => {
      queue.forEach(eff => {
        eff.d.forEach(d => d.delete(eff));
        eff.d.clear();
        if (eff.h) return;
        running = eff;
        eff();
      });
      queue.clear();
      // nb: nested effects are impossible
      running = null;
    });
  }
  queue.add(eff);
};
export const nextTick = queueMicrotask;

export const reactive = (scope: any, parent: any) => {
  const deps: Record<keyof any, Set<Effect>> = {};
  const desc = object.getOwnPropertyDescriptors(scope);
  for (const key in desc) {
    if (desc[key].writable) {
      setProperty(scope, key, dependOn(deps[key] = new Set(), scope[key]));
    }
  }

  return scope = proxy(
    scope,
    (obj, k) => k in obj ? read(deps[k], obj, k, scope) : parent[k],
    (obj, k, v) => k in obj ? write(deps[k], obj, k, v, scope) : setProperty(parent, k, v),
    (obj, k) => k in obj || k in parent,
  );
};

let running: Effect | null;
export const effectTree = <Set<Effect>[]> [];
export const effect = (fn: () => void) => {
  effectTree.forEach(t => t.add(<any> fn));
  (<any> fn).d = new Set();
  enqueue(<any> fn);
};
