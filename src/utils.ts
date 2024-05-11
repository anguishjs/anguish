export const classOf = (obj: any) => obj?.constructor;
export const object: ObjectConstructor = classOf({});
export const createObject = object.create;

export const reflect = Reflect;
export const setProperty = reflect.set;
