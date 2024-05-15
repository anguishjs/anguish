export const classOf = (obj: any) => obj?.constructor;
export const object: ObjectConstructor = classOf({});
export const createObject = object.create;
export const defineProperty = object.defineProperty;

export const reflect = Reflect;
