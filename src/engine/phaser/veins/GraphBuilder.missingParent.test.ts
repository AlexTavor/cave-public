import { describe, expect, it } from "vitest";
import { GraphBuilder } from "./GraphBuilder";
import type { RuntimeEntity } from "../../runtime/types";
import type { VeinGraph } from "./types";

const makeBody = (id: string) => ({
    id,
    entity: id,
    x: 10,
    y: 10,
    mass: 1,
    radius: 10,
    drag: 0.1,
    position: { x: 10, y: 10 },
    prevPosition: { x: 10, y: 10 },
    acceleration: { x: 0, y: 0 },
    isStatic: true,
});

describe("GraphBuilder missing parent fallback", () => {
    it("falls back to direct routing when the parent entity is missing", () => {
        const entities: RuntimeEntity[] = [
            { id: "sys_world" },
            {
                id: "child",
                parent: { parentId: "missing_parent" },
                powerSink: { baseDemand: { body: 1 } } as never,
            },
        ];
        const graph: VeinGraph = { nodes: new Map(), edges: [] };
        const bodies = entities.reduce((map, entity) => {
            const id = entity.id;
            if (!id) return map;
            map.set(id, makeBody(id));
            return map;
        }, new Map<string, ReturnType<typeof makeBody>>());

        new GraphBuilder().build(
            {
                getEntities: () => entities,
                getEntity: (id: string) =>
                    entities.find((entity) => entity.id === id),
                getParentId: () => undefined,
                getPhysicsBody: (id: string) => bodies.get(id),
                query: ({ tag }: { tag: string }) =>
                    entities.filter((entity) =>
                        (entity as any).tags?.includes(tag),
                    ),
            } as never,
            graph,
        );

        expect(graph.edges).toContainEqual(
            expect.objectContaining({
                sourceId: "sys_world",
                targetId: "child",
                kind: "resource-demand",
            }),
        );
    });
});
