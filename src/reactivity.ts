import { classOf, createObject, object, reflect, setProperty } from "./utils";

export type Effect = { (): void; d: Set<Set<Effect>>; h?: boolean };

export const observedNodes = new Map<Node, Set<Effect>>();

const dependOn = (deps: Set<Effect>, value: any) => {
  if (classOf(value) == object || classOf(value) == Array) {
    value = new Proxy(value, {
      get: (obj, k) => read(deps, obj, k, value),
      set: (obj, k, v) => write(deps, obj, k, v, value),
    });
  } else if (value instanceof Node) {
    observedNodes.set(value, deps);
  }
  return value;
};

const read = (deps: Set<Effect>, target: any, key: keyof any, recv?: any) => {
  if (deps) running?.d.add(deps.add(running));
  return reflect.get(target, key, recv);
};

const write = (deps: Set<Effect>, target: any, key: keyof any, value: any, recv?: any) => {
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

export const initScope = (scope: any, props: any) => {
  props.$refs = createObject(scope.$refs);
  const desc = object.getOwnPropertyDescriptors(props);
  for (const key in desc) {
    const deps = new Set<Effect>();
    if (desc[key].writable) {
      props[key] = dependOn(deps, props[key]);
    }
    object.defineProperty(scope, key, {
      get: () => read(deps, props, key, props),
      set: value => write(deps, props, key, value, props),
    });
  }
};

let running: Effect | null;
export const effectTree = <Set<Effect>[]> [];
export const effect = (fn: () => void) => {
  effectTree.forEach(t => t.add(<any> fn));
  (<any> fn).d = new Set();
  enqueue(<any> fn);
};
