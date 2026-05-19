import type { RuntimeEntity } from "../../runtime/types";
import type { ResourceAttribute } from "./graphBuilderUtils";
import type { VeinGraph } from "./types";
import { readComfort01, resolveNervousDeliveredRate } from "./nervousVeinFlow";
import { resolveTerminalChainTargetId } from "./veinFlowTerminalTarget";

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const nonNegative = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : 0;

const readAllocated = (
    entity: RuntimeEntity | undefined,
    attribute: ResourceAttribute,
) =>
    nonNegative(
        (entity as { powerSink?: { allocatedDraw?: Record<string, number> } })
            .powerSink?.allocatedDraw?.[attribute],
    );

const readThrottle = (entity: RuntimeEntity | undefined): number => {
    const throttle = (entity as { powerSink?: { throttle?: number } }).powerSink
        ?.throttle;
    return clamp(Number.isFinite(throttle) ? (throttle ?? 1) : 1, 0, 1);
};

export const projectVeinEdgeFlow = (
    graph: VeinGraph,
    entities: ReadonlyArray<RuntimeEntity>,
): void => {
    const entityById = new Map<string, RuntimeEntity>();
    for (const entity of entities) {
        if (typeof entity.id === "string") entityById.set(entity.id, entity);
    }
    const comfort01 = readComfort01(entityById.get("sys_world"));
    graph.edges.forEach((edge, index) => {
        if (edge.attribute === "nervous") {
            edge.deliveredRate = resolveNervousDeliveredRate(
                edge,
                entityById,
                graph,
            );
            edge.throttle01 = 1;
            edge.comfort01 = comfort01;
            return;
        }
        const targetId = resolveTerminalChainTargetId(
            graph,
            index,
            "projectVeinEdgeFlow",
        );
        edge.deliveredRate = readAllocated(
            entityById.get(targetId),
            edge.attribute,
        );
        edge.throttle01 = readThrottle(entityById.get(targetId));
        edge.comfort01 = undefined;
    });
};
