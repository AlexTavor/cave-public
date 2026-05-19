import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

describe("spawnerCompiler", () => {
    it("emits SPAWN_BODY actions for each count", () => {
        const blueprint = createBlueprint("bp_spawner", {
            components: {},
            _editor: {
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
                            blueprintId: "bp_child",
                            count: { base: 2, perBody: 0, multPerBody: 0 },
                            mode: "spawn_body",
                            target: "self",
                            conditions: [],
                        },
                    ],
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const rules = compiled.components.behavior?.rules ?? [];
        const spawnerRule = rules.find((rule) =>
            rule.actions.some((action) => action.type === "SPAWN_BODY"),
        );

        expect(spawnerRule?.actions).toHaveLength(2);
        expect(spawnerRule?.actions[0]).toEqual({
            type: "SPAWN_BODY",
            blueprintId: "bp_child",
            target: "self",
        });
    });

    it("emits SPAWN actions when mode is spawn", () => {
        const blueprint = createBlueprint("bp_spawner", {
            components: {},
            _editor: {
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
                            blueprintId: "bp_ghost",
                            count: { base: 1, perBody: 0, multPerBody: 0 },
                            mode: "spawn",
                            target: "sys_world",
                            conditions: [],
                        },
                    ],
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const rules = compiled.components.behavior?.rules ?? [];
        const spawnerRule = rules.find((rule) =>
            rule.actions.some((action) => action.type === "SPAWN"),
        );

        expect(spawnerRule?.actions[0]).toEqual({
            type: "SPAWN",
            blueprintId: "bp_ghost",
        });
    });
});
