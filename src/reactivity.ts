const stack = <(() => void)[]> [];

export const reactive = (scope: any, parent: any = {}) => {
  if (typeof scope != "object" || !scope) return scope;

  const deps: Record<string, Set<() => void>> = {};
  for (const key in scope) {
    deps[key] = new Set<() => void>();
    scope[key] = reactive(scope[key]);
  }

  return new Proxy(scope, {
    get: (target, key: string /* gaslighting */) => {
      if (key in deps) {
        if (stack[0]) deps[key].add(stack[0]);
        return target[key];
      }
      return parent[key];
    },
    set: (target, key: string, value) => {
      if (key in deps) {
        queueJob(() => deps[key].forEach(dep => dep()));
        target[key] = reactive(value);
      } else {
        parent[key] = reactive(value);
      }
      return true;
    },
    has: (target, key: string) => key in target || key in parent,
  });
};

export const effect = (fn: () => void) => {
  const execute = () => {
    stack.unshift(execute);
    try {
      fn();
    } finally {
      stack.shift();
    }
  };

  execute();
};

const queue = <(() => void)[]> [];
export const nextTick = queueMicrotask;
export const queueJob = (fn: () => void) => {
  queue.push(fn);
  if (queue.length == 1) {
    nextTick(() => {
      queue.forEach(fn => fn());
      queue.length = 0;
    });
  }
};
