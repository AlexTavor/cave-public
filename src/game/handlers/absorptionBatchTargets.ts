import type { RuntimeEntity } from "../../engine/runtime/types";

export const resolveTargetId = (
    station: RuntimeEntity,
    target?: string,
): string => {
    if (!target || target === "sys_world") return "sys_world";
    if (target === "self") return station.id ?? "sys_world";
    return target;
};
