export type Effect = { (): void; d: Set<Set<Effect>>; h?: boolean };

const queue = new Set<Effect>();
export const reactive = (scope: any) => {
  const deps: Record<keyof any, Set<Effect>> = {};

  return new Proxy(scope, {
    get: (target, key) => {
      running?.d.add((deps[key] ??= new Set()).add(running));
      return target[key];
    },
    set: (target, key, value) => {
      (deps[key] ??= new Set()).forEach((eff) => {
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
    },
    has: (target, key) => key in target,
  });
};

export const subscope = (scope: any, parent: any) =>
  new Proxy(reactive(scope), {
    get: (target, key) => key in target ? target[key] : parent[key],
    set: (target, key, value) => {
      (key in target ? target : parent)[key] = value;
      return true;
    },
    has: (target, key) => key in target || key in parent,
  });

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
