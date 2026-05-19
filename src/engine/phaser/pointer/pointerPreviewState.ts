import type { Runtime } from "../../runtime/Runtime";

const readPointerState = (runtime: Runtime) =>
    runtime.getEntity("sys_pointer") as
        | {
              state?: Record<string, { value?: unknown }>;
              assignment?: { assignedIds?: string[] };
          }
        | undefined;

export const readPointerStateNumber = (runtime: Runtime, key: string) => {
    const value = readPointerState(runtime)?.state?.[key]?.value;
    return typeof value === "number" ? value : 0;
};

export const readPointerStateString = (runtime: Runtime, key: string) => {
    const value = readPointerState(runtime)?.state?.[key]?.value;
    return typeof value === "string" ? value : "";
};

export const readPointerCarriedCount = (runtime: Runtime): number => {
    const assignedIds = readPointerState(runtime)?.assignment?.assignedIds;
    return Array.isArray(assignedIds) ? assignedIds.length : 0;
};
