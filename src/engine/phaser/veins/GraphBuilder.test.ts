import { describe, expect, it } from "vitest";
import { GraphBuilder } from "./GraphBuilder";
import { Snapshot } from "../../runtime/Snapshot";
import { ImpulseEngine } from "../../physics/impulse/ImpulseEngine";
import { createImpulseConfig } from "../../test/factories";
import type { RuntimeEntity } from "../../runtime/types";
import type { VeinGraph } from "./types";
import { PASSPORT_NERVOUS_VEIN_TAG } from "../../../data/schemas/abilities/passport";

const makeBody = (id: string, x: number, y: number, radius = 10) => ({
    id,
    entity: id,
    x,
    y,
    mass: 1,
    radius,
    drag: 0.1,
    position: { x, y },
    prevPosition: { x, y },
    acceleration: { x: 0, y: 0 },
    isStatic: true,
});

const buildSnapshot = (entities: RuntimeEntity[]): Snapshot => {
    const engine = new ImpulseEngine(createImpulseConfig());
    for (const entity of entities) {
        if (!entity.id) continue;
        engine.addBody(makeBody(entity.id, 10, 10));
    }
    return new Snapshot(entities, engine);
};

const makeGraph = (): VeinGraph => ({ nodes: new Map(), edges: [] });

describe("GraphBuilder", () => {
    it("roots demand edges at sys_world", () => {
        const entities: RuntimeEntity[] = [
            { id: "sys_world" },
            { id: "worker", tags: ["demand:body"] },
        ];
        const snapshot = buildSnapshot(entities) as Snapshot & {
            getParentId: (id: string) => string | undefined;
        };
        snapshot.getParentId = (id: string) =>
            (entities.find((entity) => entity.id === id) as any)?.parent
                ?.parentId;
        const builder = new GraphBuilder();
        const graph = makeGraph();

        builder.build(snapshot, graph);

        expect(graph.nodes.has("sys_world")).toBe(true);
        expect(graph.edges).toContainEqual(
            expect.objectContaining({
                sourceId: "sys_world",
                targetId: "worker",
                kind: "resource-demand",
            }),
        );
    });

    it("creates cave-to-passport nervous edges", () => {
        const entities: RuntimeEntity[] = [
            { id: "sys_world" },
            { id: "carrier", tags: [PASSPORT_NERVOUS_VEIN_TAG] },
        ];
        const snapshot = buildSnapshot(entities);
        const builder = new GraphBuilder();
        const graph = makeGraph();

        builder.build(snapshot, graph);

        const worldFaceEdges = graph.edges.filter(
            (edge) =>
                edge.sourceId === "sys_world" && edge.targetId === "carrier",
        );
        expect(worldFaceEdges).toHaveLength(1);
    });
});

