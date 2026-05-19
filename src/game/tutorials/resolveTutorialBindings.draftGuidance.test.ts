import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { resolveTutorialBindings } from "./resolveTutorialBindings";

const snapshot = new Snapshot(
    [{ id: "sys_world" }],
    { getBody: () => undefined } as any,
    {},
);
const guidanceIndex = new Map<string, any>([
    [
        "draft",
        {
            id: "draft",
            presentation: "draft_guidance",
            targetOptionId: "opt_alpha",
            attention: ["stop_time"],
        },
    ],
]);

describe("resolveTutorialBindings draft_guidance", () => {
    it("binds targetOptionId and rejects auto self when no effective target exists", () => {
        expect(
            resolveTutorialBindings({
                snapshot,
                guidanceIndex: guidanceIndex as any,
                tutorial: {
                    id: "intro",
                    selfDefinition: { kind: "auto" },
                    guidances: [{ guidanceId: "draft" }],
                } as any,
            }),
        ).toMatchObject({
            kind: "error",
            error: "Tutorial 'intro' self could not resolve.",
        });
    });

    it("rejects multiple draft bindings and invalid overrides", () => {
        expect(
            resolveTutorialBindings({
                snapshot,
                guidanceIndex: guidanceIndex as any,
                tutorial: {
                    id: "intro",
                    selfDefinition: { kind: "auto" },
                    guidances: [
                        { guidanceId: "draft" },
                        { guidanceId: "draft" },
                    ],
                } as any,
            }),
        ).toMatchObject({ kind: "error" });
        expect(
            resolveTutorialBindings({
                snapshot,
                guidanceIndex: guidanceIndex as any,
                tutorial: {
                    id: "intro",
                    selfDefinition: { kind: "auto" },
                    guidances: [{ guidanceId: "draft", textOverride: "No" }],
                } as any,
            }),
        ).toMatchObject({ kind: "error" });
        expect(
            resolveTutorialBindings({
                snapshot,
                guidanceIndex: guidanceIndex as any,
                tutorial: {
                    id: "intro",
                    selfDefinition: { kind: "auto" },
                    guidances: [
                        {
                            guidanceId: "draft",
                            targetOverride: {
                                kind: "entity_id",
                                entityId: "sys_world",
                            },
                        },
                    ],
                } as any,
            }),
        ).toMatchObject({ kind: "error" });
    });
});
