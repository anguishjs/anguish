export const classOf = (obj: any) => obj?.constructor;
export const object: ObjectConstructor = classOf({});
export const createObject = object.create;
export const defineProperty = object.defineProperty;

export const consumeSet = <T>(set: Set<T>, fn: (v: T) => void) => {
  set.forEach(fn);
  set.clear();
};
