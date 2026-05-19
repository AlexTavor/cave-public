import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

describe("spawnerCompiler conditions", () => {
    it("appends condition gates to spawner rules", () => {
        const blueprint = createBlueprint("bp_spawner", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 1, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        conditions: [],
                    },
                    spawner: [
                        {
                            blueprintId: "bp_child",
                            count: { base: 1, perBody: 0, multPerBody: 0 },
                            mode: "spawn_body",
                            target: "self",
                            conditions: [
                                {
                                    kind: "world_state_threshold",
                                    key: "ready",
                                    operator: ">=",
                                    value: 1,
                                },
                            ],
                        },
                    ],
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const rule = compiled.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_spawner_bp_child_0",
        );
        const conditions = rule?.conditions ?? [];

        expect(conditions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    compiled: {
                        ">=": [{ var: "sys_world.state.ready.value" }, 1],
                    },
                }),
            ]),
        );
    });
});

