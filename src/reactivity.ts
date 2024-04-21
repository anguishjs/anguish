export type Effect = { (): void; d: Set<Set<Effect>>; h?: boolean };
type Callback = { (): void; e?: Effect };

export const observedNodes = new Map<Node, Set<Effect>>();

const classOf = (obj: any) => obj?.constructor;
const proxy = (
  obj: any,
  get: (t: any, k: string) => any,
  set: (t: any, k: string, v: any) => boolean,
  has?: (t: any, k: string) => boolean,
) => new Proxy(obj, { get, set, has });

const dependOn = (deps: Set<Effect>, value: any) => {
  if (classOf(value) == Object || classOf(value) == Array) {
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
  return Reflect.get(target, key, recv);
};

const write = (deps: Set<Effect>, target: any, key: keyof any, value: any, recv: any) => {
  deps.forEach(enqueue);
  value = dependOn(deps, value);
  return Reflect.set(target, key, value, recv);
};

const queue = new Set<Effect>();
export const enqueue = (eff: Effect) => {
  if (!queue.size) {
    nextTick(() => {
      queue.forEach(eff => eff());
      queue.clear();
    });
  }
  queue.add(eff);
};
export const nextTick = (fn: () => void) => queueMicrotask(fn);

export const reactive = (scope: any, parent: any) => {
  const deps: Record<keyof any, Set<Effect>> = {};
  const desc = Object.getOwnPropertyDescriptors(scope);
  for (const key in desc) {
    if ("value" in desc[key]) {
      Reflect.set(scope, key, dependOn(deps[key] = new Set(), scope[key]));
    }
  }

  return scope = proxy(
    scope,
    (obj, k) => k in obj ? read(deps[k], obj, k, scope) : parent[k],
    (obj, k, v) => k in obj ? write(deps[k], obj, k, v, scope) : (parent[k] = v, true),
    (obj, k) => k in obj || k in parent,
  );
};

let running: Effect;
export const effect = (fn: Callback) => {
  const execute: Effect = () => {
    execute.d.forEach(d => d.delete(execute));
    execute.d.clear();
    if (execute.h) return;
    const lastRunning = running;
    running = execute;
    try {
      fn();
    } finally {
      running = lastRunning;
    }
  };

  execute.d = new Set();
  enqueue(fn.e = execute);
};
