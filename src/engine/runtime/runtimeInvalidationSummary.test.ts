import { describe, expect, it } from "vitest";
import { RuntimeCommandType } from "./types";
import { resolveRuntimeInvalidationSummary } from "./runtimeInvalidationSummary";

describe("resolveRuntimeInvalidationSummary", () => {
    it("maps direct entity ids and invalidation flags", () => {
        const summary = resolveRuntimeInvalidationSummary([
            {
                type: RuntimeCommandType.TRANSFER_ASSETS,
                payload: { sourceId: "source", targetId: "target" },
            },
            {
                type: RuntimeCommandType.PATCH_BLUEPRINT,
                payload: { blueprintId: "worker", components: {} },
            },
        ] as any);

        expect(summary).toEqual({
            changedEntityIds: ["source", "target"],
            entityListChanged: true,
            blueprintChanged: true,
        });
    });

    it("maps batch updates and world-scoped commands", () => {
        const summary = resolveRuntimeInvalidationSummary([
            {
                type: RuntimeCommandType.UPDATE_BODIES_BATCH,
                payload: { updates: [{ entityId: "a" }, { entityId: "b" }] },
            },
            {
                type: RuntimeCommandType.ACKNOWLEDGE_NOTIFICATION_ABILITY_GUIDANCE,
                payload: {},
            },
        ] as any);

        expect(summary.changedEntityIds).toEqual(["a", "b", "sys_world"]);
        expect(summary.entityListChanged).toBe(false);
        expect(summary.blueprintChanged).toBe(false);
    });

    it("treats tutorial acknowledge as a world mutation", () => {
        const summary = resolveRuntimeInvalidationSummary([
            {
                type: RuntimeCommandType.ACKNOWLEDGE_TUTORIAL_MODAL_GUIDANCE,
                payload: { bindingId: "bind-1" },
            },
        ] as any);

        expect(summary.changedEntityIds).toEqual(["sys_world"]);
    });

    it("filters empty ids from the normalized summary", () => {
        const summary = resolveRuntimeInvalidationSummary([
            {
                type: RuntimeCommandType.SPAWN,
                payload: { id: "", parentId: "parent" },
            },
            { type: RuntimeCommandType.KILL, payload: { entityId: "" } },
        ] as any);

        expect(summary.changedEntityIds).toEqual(["parent", "sys_world"]);
    });
});
