import { describe, expect, it } from "vitest";
import { PASSPORT_NERVOUS_VEIN_TAG } from "../../../data/schemas/abilities/passport";
import type { RuntimeEntity } from "../../runtime/types";
import { GraphBuilder } from "./GraphBuilder";

const buildEdges = (entities: RuntimeEntity[]) => {
    const builder = new GraphBuilder();
    const graph = { nodes: new Map(), edges: [] as any[] };
    const bodies = new Map(
        entities.map((entity) => [
            entity.id ?? "",
            {
                id: entity.id ?? "",
                entity: entity.id ?? "",
                x: 10,
                y: 10,
                mass: 1,
                radius: 10,
                drag: 0.1,
                position: { x: 10, y: 10 },
                prevPosition: { x: 10, y: 10 },
                acceleration: { x: 0, y: 0 },
                isStatic: true,
            },
        ]),
    );
    builder.build(
        {
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
        } as never,
        graph as never,
    );
    return graph.edges.filter((edge) => edge.kind === "nervous");
};

describe("GraphBuilder nervous passport routing", () => {
    it("routes passport nervous entities through parents and avoids duplicate routes", () => {
        const edges = buildEdges([
            { id: "sys_world" },
            { id: "parent", parent: { parentId: "sys_world" } as never },
            {
                id: "child",
                parent: { parentId: "parent" } as never,
                tags: [PASSPORT_NERVOUS_VEIN_TAG],
                assignment: {},
            },
            { id: "direct", tags: [PASSPORT_NERVOUS_VEIN_TAG] },
        ] as RuntimeEntity[]);

        expect(edges).toContainEqual(
            expect.objectContaining({
                sourceId: "sys_world",
                targetId: "parent",
            }),
        );
        expect(edges).toContainEqual(
            expect.objectContaining({ sourceId: "parent", targetId: "child" }),
        );
        expect(edges).toContainEqual(
            expect.objectContaining({
                sourceId: "sys_world",
                targetId: "direct",
            }),
        );
        expect(edges.filter((edge) => edge.targetId === "child")).toHaveLength(
            1,
        );
    });
});
