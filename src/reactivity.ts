import { classOf, consumeSet, defineProperty, descriptors, object } from "./utils";

export type Effect = { (): void; d: Set<Set<Effect>>; h?: boolean };

export const read = (deps: Set<Effect>) => running?.d.add(deps.add(running));
export const write = (deps: Set<Effect>) => deps.forEach(enqueue);

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

export interface Ref<T> {
  value: T;
  [REF]: true;
}

export type UnwrapRef<T> = T extends Ref<infer V> ? V : T;

export type MaybeRef<T> = T | Ref<T>;

const REF = Symbol();
export const ref: {
  <T>(value: T): Ref<UnwrapRef<T>>;
  <T = any>(): Ref<T | undefined>;
} = (value?: any) => {
  if (isRef(value)) return value;

  return defineProperty(<any> { [REF]: 1 }, "value", reactiveProp(value));
};
export const isRef = <T>(ref: Ref<T> | unknown): ref is Ref<T> => {
  return !!(<any> ref)?.[REF];
};
export const unref = <T>(value: MaybeRef<T>): T => {
  return isRef(value) ? value.value : value;
};
export const computed = <T>(get: (previous?: T) => T): Ref<T> => {
  const data = ref<T>();
  effect(() => data.value = get(data.value));
  return data as Ref<T>;
};

const REACTIVE = Symbol();
export const reactive = (value: any, deps: Set<Effect>): any => {
  if ((classOf(value) == object || classOf(value) == Array) && !value[REACTIVE]) {
    return new Proxy(value, {
      get: (obj, k) => k == REACTIVE ? 1 : (read(deps), reactive(obj[k], deps)),
      set: (obj, k, v) => (write(deps), obj[k] = v, true),
    });
  }
  return value;
};
export const reactiveProp = (value?: any, deps = new Set<Effect>()): PropertyDescriptor => {
  if (isRef(value)) return descriptors(value).value;
  value = reactive(value, deps);
  return {
    get: () => (read(deps), value),
    set: x => (write(deps), value = reactive(x, deps)),
  };
};

let running: Effect | null;
export const effectTree = <Set<Effect>[]> [];
export const effect = (fn: () => void) => {
  effectTree.forEach(t => t.add(<any> fn));
  (<any> fn).d = new Set();
  enqueue(<any> fn);
};
