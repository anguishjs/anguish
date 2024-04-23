export const classOf = (obj: any) => obj?.constructor;
export const object: ObjectConstructor = classOf({});

export const reflect = Reflect;
export const setProperty = reflect.set;
