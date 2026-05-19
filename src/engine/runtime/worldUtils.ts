import type { World } from "miniplex";

export const createDirtyWorld = <T extends object>(
    world: World<T>,
    markDirty: () => void,
): World<T> =>
    new Proxy(world, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (prop === "add" && typeof value === "function") {
                return (entity: T) => {
                    const result = value.call(target, entity);
                    markDirty();
                    return result;
                };
            }

            if (prop === "remove" && typeof value === "function") {
                return (entity: T) => {
                    const result = value.call(target, entity);
                    markDirty();
                    return result;
                };
            }

            return value;
        },
    });
