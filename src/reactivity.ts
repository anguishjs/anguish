export type Effect = { (): void; d: Set<Set<Effect>>; h?: boolean };

const classOf = (obj: any) => obj?.constructor;
const proxy = (
  obj: any,
  get: (t: any, k: string) => any,
  set: (t: any, k: string, v: any) => boolean,
  has?: (t: any, k: string) => boolean,
) => new Proxy(obj, { get, set, has });

const read = (deps: Set<Effect>, target: any, key: keyof any) => {
  running?.d.add(deps.add(running));
  return target[key];
};

const write = (deps: Set<Effect>, target: any, key: keyof any, value: any) => {
  deps.forEach((eff) => {
    queue.add(eff);
    if (queue.size == 1) {
      nextTick(() => {
        queue.forEach(eff => eff());
        queue.clear();
      });
    }
  });
  target[key] = value;
  return true;
};

const queue = new Set<Effect>();
export const reactive = (scope: any) => {
  const deps: Record<keyof any, Set<Effect>> = {};
  for (const key in scope) {
    const value = scope[key];
    if (classOf(value) == Array || classOf(value) == Object) {
      scope[key] = proxy(
        value,
        (obj, k) => read(deps[key], obj, k),
        (obj, k, v) => write(deps[key], obj, k, v),
      );
    }
  }

  return proxy(
    scope,
    (obj, k) => read(deps[k] ??= new Set(), obj, k),
    (obj, k, v) => write(deps[k] ??= new Set(), obj, k, v),
  );
};

export const subscope = (scope: any, parent: any) =>
  proxy(
    reactive(scope),
    (obj, k) => k in obj ? obj[k] : parent[k],
    (obj, k, v) => {
      (k in obj ? obj : parent)[k] = v;
      return true;
    },
    (obj, k) => k in obj || k in parent,
  );

let running: Effect;
export const effects = <Effect[]> [];
export const effect = (fn: () => void) => {
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
  effects.push(execute);
  execute();
};

export const nextTick = (fn: () => void) => queueMicrotask(fn);
