import { describe, expect, it } from "vitest";
import { GraphBuilder } from "./GraphBuilder";
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

describe("GraphBuilder parent routing", () => {
    it("routes parented sinks and passport nervous veins through ancestors", () => {
        const entities: RuntimeEntity[] = [
            { id: "sys_world" },
            { id: "parent", parent: { parentId: "sys_world" } },
            {
                id: "child",
                parent: { parentId: "parent" },
                powerSink: {
                    baseDemand: { body: 1 },
                    allocatedDraw: { body: 1 },
                } as never,
            },
            {
                id: "carrier",
                parent: { parentId: "parent" },
                tags: [PASSPORT_NERVOUS_VEIN_TAG],
            },
            {
                id: "direct",
                powerSink: {
                    baseDemand: { body: 1 },
                    allocatedDraw: { body: 1 },
                } as never,
            },
        ];
        const builder = new GraphBuilder();
        const graph: VeinGraph = { nodes: new Map(), edges: [] };
        const bodies = entities.reduce((map, entity) => {
            if (!entity.id) return map;
            map.set(entity.id, makeBody(entity.id, 10, 10));
            return map;
        }, new Map<string, ReturnType<typeof makeBody>>());
        const source = {
            getEntities: () => entities,
            getEntity: (id: string) =>
                entities.find((entity) => entity.id === id),
            getParentId: (id: string) =>
                (entities.find((entity) => entity.id === id) as any)?.parent
                    ?.parentId,
            getPhysicsBody: (id: string) => bodies.get(id),
            query: ({ tag }: { tag: string }) =>
                entities.filter((entity) =>
                    (entity as any).tags?.includes(tag),
                ),
        };

        builder.build(source as never, graph);

        expect(graph.edges).toContainEqual(
            expect.objectContaining({
                sourceId: "sys_world",
                targetId: "parent",
                attribute: "body",
            }),
        );
        expect(graph.edges).toContainEqual(
            expect.objectContaining({
                sourceId: "parent",
                targetId: "child",
                kind: "resource-demand",
            }),
        );
        expect(graph.edges).toContainEqual(
            expect.objectContaining({
                sourceId: "sys_world",
                targetId: "parent",
                kind: "nervous",
            }),
        );
        expect(graph.edges).toContainEqual(
            expect.objectContaining({
                sourceId: "parent",
                targetId: "carrier",
                kind: "nervous",
            }),
        );
        expect(graph.edges).toContainEqual(
            expect.objectContaining({
                sourceId: "sys_world",
                targetId: "direct",
                kind: "resource-demand",
            }),
        );
    });
});
