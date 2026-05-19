import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { resolveTutorialBindings } from "./resolveTutorialBindings";

const makeSnapshot = (entities: any[]) =>
    new Snapshot(entities, { getBody: () => undefined } as any, {});
const guidanceIndex = new Map<string, any>([
    [
        "node",
        {
            id: "node",
            presentation: "node_callout",
            target: { kind: "entity_tag", tag: "egg" },
            slot: "top",
            text: "Node",
            attention: [],
            imageUrl: null,
        },
    ],
    [
        "modal",
        {
            id: "modal",
            presentation: "modal",
            title: "Modal",
            text: "Body",
            attention: [],
            imageUrl: null,
        },
    ],
]);

describe("resolveTutorialBindings", () => {
    it("resolves override precedence and auto self from the first effective target", () => {
        const snapshot = makeSnapshot([
            { id: "sys_world" },
            { id: "egg_a", tags: ["egg"] },
            { id: "egg_b", tags: ["egg"] },
        ]);
        const result = resolveTutorialBindings({
            snapshot,
            guidanceIndex: guidanceIndex as any,
            tutorial: {
                id: "intro",
                selfDefinition: { kind: "auto" },
                guidances: [
                    { guidanceId: "modal" },
                    {
                        guidanceId: "node",
                        targetOverride: {
                            kind: "entity_id",
                            entityId: "egg_b",
                        },
                    },
                ],
            } as any,
        });
        expect(result).toMatchObject({
            kind: "resolved",
            primaryTargetId: "egg_b",
            selfId: "egg_b",
        });
    });

    it("resolves modal-only auto self to sys_world", () => {
        const snapshot = makeSnapshot([
            { id: "sys_world" },
            { id: "egg_a", tags: ["egg"] },
        ]);
        expect(
            resolveTutorialBindings({
                snapshot,
                guidanceIndex: guidanceIndex as any,
                tutorial: {
                    id: "intro",
                    selfDefinition: { kind: "auto" },
                    guidances: [{ guidanceId: "modal" }],
                } as any,
            }),
        ).toMatchObject({
            kind: "resolved",
            selfId: "sys_world",
        });
    });

    it("still errors on missing references", () => {
        const snapshot = makeSnapshot([
            { id: "sys_world" },
            { id: "egg_a", tags: ["egg"] },
        ]);
        expect(
            resolveTutorialBindings({
                snapshot,
                guidanceIndex: guidanceIndex as any,
                tutorial: {
                    id: "bad",
                    selfDefinition: { kind: "entity_id", entityId: "missing" },
                    guidances: [{ guidanceId: "missing" }],
                } as any,
            }),
        ).toMatchObject({ kind: "error" });
    });
});
