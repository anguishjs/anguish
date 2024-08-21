export const classOf = (obj: any) => obj?.constructor;
export const func: FunctionConstructor = classOf(classOf);
export const object: ObjectConstructor = classOf({});
export const createObject = object.create;
export const defineProperty = object.defineProperty;
export const descriptors = object.getOwnPropertyDescriptors;

export const consumeSet = <T>(set: Set<T>, fn: (v: T) => void) => {
  set.forEach(fn);
  set.clear();
};
