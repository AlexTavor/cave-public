import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import { getConditionalActivationActiveStateKey } from "../../runtime/conditionalActivationState";

const refs = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
        var: `self.state.${getConditionalActivationActiveStateKey(index)}.value`,
    }));

const compile = (targetIds: string[]) =>
    new CompilerService().compile(
        createBlueprint("bp_spawn_gate", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                        inputs: {},
                        oneOff: false,
                        conditions: [],
                    },
                    spawner: [
                        {
                            id: "spawn-1",
                            blueprintId: "child",
                            count: { base: 1, perBody: 0, multPerBody: 0 },
                            mode: "spawn_body",
                            target: "self",
                            conditions: [],
                        },
                    ],
                    conditionalActivation: targetIds.map((targetId) => ({
                        conditions: [
                            {
                                kind: "world_state_threshold",
                                key: "food",
                                operator: ">=",
                                value: 1,
                            },
                        ],
                        targets: [{ ability: "spawner", targetId }],
                    })),
                },
            },
        }),
    );

describe("spawnerCompiler conditionalActivation", () => {
    it("appends one active-state ref per matching conditional activation", () => {
        const activeRefs = (targetIds: string[]) =>
            compile(targetIds)
                .components.behavior?.rules?.find(
                    (entry) => entry.id === "sys_spawner_child_0",
                )
                ?.conditions.map((entry) => entry.compiled)
                .filter(
                    (entry) =>
                        typeof entry === "object" &&
                        entry !== null &&
                        "var" in entry,
                );
        expect(activeRefs([])).toEqual([]);
        expect(activeRefs(["spawn-1"])).toEqual(refs(1));
        expect(activeRefs(["spawn-1", "spawn-1"])).toEqual(refs(2));
        expect(activeRefs(["other"])).toEqual([]);
    });
});
