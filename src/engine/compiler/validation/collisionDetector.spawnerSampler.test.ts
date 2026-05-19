import { describe, it, expect } from "vitest";
import type { EditorConfig } from "../../../data/schemas/abilities";
import { collisionDetector } from "./collisionDetector";

describe("collisionDetector spawner/sampler", () => {
    it("flags spawner and sampler without cycle", () => {
        const editor: EditorConfig = {
            abilities: {
                spawner: [
                    {
                        blueprintId: "bp_child",
                        count: { base: 1, perBody: 0, multPerBody: 0 },
                        mode: "spawn_body",
                        target: "sys_world",
                        conditions: [],
                    },
                ],
                sampler: [
                    {
                        source: "sys_world.state.heat.value",
                        visible: true,
                        target: "sampled_value",
                        max: 100,
                    },
                ],
            },
        };

        const issues = collisionDetector(editor);
        expect(
            issues.some((issue) => issue.id === "spawner_requires_cycle"),
        ).toBe(true);
        expect(
            issues.some((issue) => issue.id === "sampler_requires_cycle"),
        ).toBe(true);
    });

    it("warns on missing blueprint and ignores sampler injected state", () => {
        const editor: EditorConfig = {
            abilities: {
                cycle: {
                    maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                    costMultPerCycle: 0,
                    inputs: {},
                    oneOff: false,
                    conditions: [],
                },
                spawner: [
                    {
                        blueprintId: "bp_missing",
                        count: { base: 1, perBody: 0, multPerBody: 0 },
                        mode: "spawn_body",
                        target: "sys_world",
                        conditions: [],
                    },
                ],
                sampler: [
                    {
                        source: "sys_world.state.cycle.value",
                        visible: true,
                        target: "sampled_value",
                        max: 100,
                    },
                ],
            },
        };

        const issues = collisionDetector(editor, {
            blueprintIds: ["sys_world"],
            stateKeys: ["sampled_cycle"],
        });

        expect(issues.some((issue) => issue.severity === "warning")).toBe(true);
        expect(
            issues.some(
                (issue) =>
                    issue.id === "sampler_target_collision_sampled_cycle",
            ),
        ).toBe(false);
    });
});
