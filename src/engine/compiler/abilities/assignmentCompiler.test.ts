import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { assignmentCompiler } from "./assignmentCompiler";

const compile = (config: Record<string, unknown>, withDisplay = false) => {
    const draft = createBlueprint("station", {
        components: withDisplay ? ({ display: {} } as any) : {},
    });
    assignmentCompiler(draft, {
        slots: 1,
        locking: false,
        filter: [],
        minimums: [],
        duration: 0,
        ...config,
    } as any);
    return draft;
};

describe("assignmentCompiler", () => {
    it("creates assignment component without processing state when results are absent", () => {
        const draft = compile({ slots: 2 });
        expect(draft.components.assignment).toMatchObject({
            slots: 2,
            locking: false,
            filter: [],
            assignedIds: [],
        });
        expect(draft.components.state?.processing_outputs).toBeUndefined();
        expect(
            draft.components.state?.processing_absorbs_habiti,
        ).toBeUndefined();
        expect(
            draft.components.state?.processing_destroys_assigned_bodies,
        ).toBeUndefined();
        expect(draft.components.state?.absorption_duration).toBeUndefined();
    });

    it("compiles spawn-resource rows into hidden processing outputs", () => {
        const draft = compile({
            results: [
                {
                    type: "spawn_resource",
                    resource: "wood",
                    source: "fixed",
                    factor: 2,
                },
            ],
        });
        expect(draft.components.state?.processing_outputs).toEqual({
            value: [
                {
                    resource: "wood",
                    source: "fixed",
                    factor: 2,
                    target: "sys_world",
                },
            ],
            visible: false,
        });
    });

    it("compiles transfer-habiti and destroy flags into hidden state", () => {
        const draft = compile({
            results: [
                { type: "transfer_habiti" },
                { type: "destroy_assigned_bodies" },
            ],
        });
        expect(draft.components.state?.processing_absorbs_habiti).toEqual({
            value: true,
            visible: false,
        });
        expect(
            draft.components.state?.processing_destroys_assigned_bodies,
        ).toEqual({ value: true, visible: false });
    });

    it("does not emit node-level progress state or bars", () => {
        const draft = compile({ duration: 20, showProgress: true }, true);
        expect(draft.components.state?.absorption_duration).toEqual({
            value: 20,
            visible: false,
        });
        expect(draft.components.state?.absorption_progress).toBeUndefined();
        expect(draft.components.display?.bars ?? []).toEqual([]);
    });
});

