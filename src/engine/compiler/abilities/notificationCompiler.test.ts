import { describe, it, expect, vi } from "vitest";
import type { NotificationAbilityConfig } from "../../../data/schemas/abilities/notifications";
import { createBlueprint } from "../../test/factories";
import { notificationCompiler } from "./notificationCompiler";

const makeCycleBlueprint = () =>
    createBlueprint("b1", {
        components: {
            display: { label: "b1", display_key: "unknown" },
            behavior: {
                rules: [
                    {
                        id: "sys_cycle_reset",
                        sortKey: "z_reset",
                        conditions: [],
                        actions: [],
                    },
                ],
            },
        },
    });

const makeAssignmentBlueprint = () =>
    createBlueprint("b1", {
        components: {
            display: { label: "b1", display_key: "unknown" },
            behavior: {
                rules: [
                    {
                        id: "sys_assignment_complete_reset",
                        sortKey: "z_reset",
                        conditions: [],
                        actions: [],
                    },
                ],
            },
        },
    });

describe("notificationCompiler", () => {
    it("skips empty config without mutating draft", () => {
        const draft = createBlueprint("b1");
        notificationCompiler(draft, []);
        expect(draft.components.behavior).toBeUndefined();
    });

    it("appends modal-guidance actions to sys_cycle_reset", () => {
        const draft = makeCycleBlueprint();
        const config: NotificationAbilityConfig = [
            { id: "r1", title: "First", text: "One", imageUrl: null },
            { id: "r2", title: "", text: "Two", imageUrl: "img.gif" },
        ];
        notificationCompiler(draft, config);
        const actions = draft.components.behavior?.rules?.[0].actions ?? [];
        expect(actions).toEqual([
            {
                type: "SHOW_NOTIFICATION_ABILITY_GUIDANCE",
                abilityId: "r1",
                title: "First",
                text: "One",
                imageUrl: null,
            },
            {
                type: "SHOW_NOTIFICATION_ABILITY_GUIDANCE",
                abilityId: "r2",
                title: "",
                text: "Two",
                imageUrl: "img.gif",
            },
        ]);
    });

    it("falls back to sys_assignment_complete_reset when cycle reset is absent", () => {
        const draft = makeAssignmentBlueprint();
        const config: NotificationAbilityConfig = [
            { id: "r1", title: "First", text: "One", imageUrl: null },
        ];
        notificationCompiler(draft, config);
        expect(draft.components.behavior?.rules?.[0].actions).toEqual([
            {
                type: "SHOW_NOTIFICATION_ABILITY_GUIDANCE",
                abilityId: "r1",
                title: "First",
                text: "One",
                imageUrl: null,
            },
        ]);
    });

    it("warns when cycle trigger has no reset rule", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const draft = createBlueprint("b1");
        const config: NotificationAbilityConfig = [
            { id: "r1", title: "First", text: "One", imageUrl: null },
        ];
        notificationCompiler(draft, config);
        expect(spy).toHaveBeenCalledOnce();
        spy.mockRestore();
    });
});

