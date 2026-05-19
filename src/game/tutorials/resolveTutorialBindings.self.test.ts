import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { resolveTutorialBindings } from "./resolveTutorialBindings";

const snapshot = new Snapshot(
    [{ id: "sys_world" }, { id: "egg_a", tags: ["egg"] }],
    { getBody: () => undefined } as any,
    {},
);

describe("resolveTutorialBindings selfTargetId", () => {
    it("writes the resolved tutorial self into every binding", () => {
        const result = resolveTutorialBindings({
            snapshot,
            guidanceIndex: new Map([
                [
                    "node",
                    {
                        id: "node",
                        presentation: "node_callout",
                        target: { kind: "entity_tag", tag: "egg" },
                        slot: "top",
                        text: "Node",
                        attention: ["hide_all_but_self"],
                    },
                ],
            ]) as any,
            tutorial: {
                id: "intro",
                selfDefinition: { kind: "auto" },
                guidances: [{ guidanceId: "node" }],
            } as any,
        }) as any;
        expect(result.kind).toBe("resolved");
        expect(result.selfId).toBe("egg_a");
        expect(result.bindings[0].selfTargetId).toBe("egg_a");
    });

    it("defers spawned_with_tag until a matching entity exists", () => {
        expect(
            resolveTutorialBindings({
                snapshot,
                guidanceIndex: new Map(),
                tutorial: {
                    id: "intro",
                    selfDefinition: {
                        kind: "spawned_with_tag",
                        tag: "hatched_egg",
                    },
                    guidances: [],
                } as any,
            }),
        ).toMatchObject({ kind: "defer" });
    });

    it("defers entity_tag self until a matching entity is resolvable", () => {
        expect(
            resolveTutorialBindings({
                snapshot,
                guidanceIndex: new Map(),
                tutorial: {
                    id: "intro",
                    selfDefinition: { kind: "entity_tag", tag: "absorption" },
                    guidances: [],
                } as any,
            }),
        ).toMatchObject({ kind: "defer" });
    });

    it("keeps tag-based self resolution deterministic", () => {
        const result = resolveTutorialBindings({
            snapshot: new Snapshot(
                [
                    { id: "sys_world" },
                    { id: "egg_b", tags: ["egg"] },
                    { id: "egg_a", tags: ["egg"] },
                ],
                { getBody: () => undefined } as any,
                {},
            ),
            guidanceIndex: new Map(),
            tutorial: {
                id: "intro",
                selfDefinition: { kind: "spawned_with_tag", tag: "egg" },
                guidances: [],
            } as any,
        }) as any;
        expect(result.selfId).toBe("egg_a");
    });

    it("resolves entity_tag self bindings through generic tag lookup", () => {
        const result = resolveTutorialBindings({
            snapshot: new Snapshot(
                [
                    { id: "sys_world" },
                    { id: "egg_b", tags: ["egg"] },
                    { id: "egg_a", tags: ["egg"] },
                ],
                { getBody: () => undefined } as any,
                {},
            ),
            guidanceIndex: new Map(),
            tutorial: {
                id: "intro",
                selfDefinition: { kind: "entity_tag", tag: "egg" },
                guidances: [],
            } as any,
        }) as any;
        expect(result.selfId).toBe("egg_a");
    });
});
