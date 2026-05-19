import type { RuntimeEntity } from "../../runtime/types";
import type { VeinEdge, VeinGraph } from "./types";

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export const readComfort01 = (entity: RuntimeEntity | undefined): number => {
    const value = (
        entity as { state?: { comfort?: { value?: unknown } } } | undefined
    )?.state?.comfort?.value;
    return clamp(typeof value === "number" ? value : 1);
};

export const resolveNervousDeliveredRate = (
    _edge: VeinEdge,
    _entityById: Map<string, RuntimeEntity>,
    _graph: VeinGraph,
): number => 0;
