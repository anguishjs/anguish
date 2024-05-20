import { classOf, consumeSet, defineProperty, object } from "./utils";

export type Effect = { (): void; d: Set<Set<Effect>>; h?: boolean };

export const observedNodes = new Map<Node, Set<Effect>>();

const read = (deps: Set<Effect>) => deps && running?.d.add(deps.add(running));
const write = (deps: Set<Effect>) => deps.forEach(enqueue);

const queue = new Set<Effect>();
export const enqueue = (eff: Effect) => {
  if (!queue.size) {
    nextTick(() =>
      consumeSet(queue, eff => {
        consumeSet(eff.d, d => d.delete(eff));
        if (!eff.h) (running = eff)();
        running = null;
      })
    );
  }
  queue.add(eff);
};
export const nextTick = queueMicrotask;

export const reactiveProp = (value?: any, deps = new Set<Effect>()): PropertyDescriptor => {
  if (classOf(value) == object || classOf(value) == Array) {
    value = new Proxy(value, {
      get: (obj, k) => (read(deps), obj[k]),
      set: (obj, k, v) => (write(deps), obj[k] = v, true),
    });
  } else if (value instanceof Node) {
    observedNodes.set(value, deps);
  }
  return {
    get: () => (read(deps), value),
    set: x => (write(deps), value = x),
  };
};

export const initScope = (scope: any, props: any) => {
  const desc = object.getOwnPropertyDescriptors(props);
  for (const key in desc) {
    defineProperty(scope, key, desc[key].writable ? reactiveProp(props[key]) : desc[key]);
  }
  props.setup && nextTick(props.setup);
};

let running: Effect | null;
export const effectTree = <Set<Effect>[]> [];
export const effect = (fn: () => void) => {
  effectTree.forEach(t => t.add(<any> fn));
  (<any> fn).d = new Set();
  enqueue(<any> fn);
};
