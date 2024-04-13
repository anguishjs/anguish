export type Effect = { (): void };

const classOf = (obj: any) => obj?.constructor;

export const reactive = (scope: any, parent: any = {}) => {
  if (classOf(scope) != Object && classOf(scope) != Array) return scope;

  const deps: Record<string, Set<Effect>> = {};
  for (const key in scope) {
    deps[key] = new Set();
    scope[key] = reactive(scope[key]);
  }

  return new Proxy(scope, {
    get: (target, key: string /* gaslighting */) => {
      if (key in deps) {
        if (running) deps[key].add(running);
        return target[key];
      }
      return parent[key];
    },
    set: (target, key: string, value) => {
      if (key in deps) {
        queueJob(() => deps[key].forEach(dep => dep()));
        target[key] = reactive(value);
      } else {
        parent[key] = value;
      }
      return true;
    },
    has: (target, key: string) => key in target || key in parent,
  });
};

let running: Effect;
export const effect = (fn: () => void) => {
  const execute: Effect = () => {
    const lastRunning = running;
    running = execute;
    try {
      fn();
    } finally {
      running = lastRunning;
    }
  };

  execute();
};

const queue = <(() => void)[]> [];
export const nextTick = (fn: () => void) => queueMicrotask(fn);
export const queueJob = (fn: () => void) => {
  queue.push(fn);
  if (queue.length == 1) {
    nextTick(() => {
      queue.forEach(fn => fn());
      queue.length = 0;
    });
  }
};
