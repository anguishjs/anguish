// @vue/reactivity, minus the 9kb bundle size.
//
// Not good scheduling, probably. No one will notice though....

const stack = <(() => void)[]> [];

export const reactive = (scope: any) => {
  const deps: Record<string, Set<() => void>> = {};
  for (const key in scope) deps[key] = new Set<() => void>();

  return new Proxy(scope, {
    get(target, key: string /* gaslighting */) {
      if (key in deps) {
        const active = stack[0];
        if (active) deps[key].add(active);
      }

      return target[key];
    },
    set(target, key: string, value) {
      target[key] = value;
      if (key in deps) queueMicrotask(() => deps[key].forEach(dep => dep()));

      return true;
    },
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
