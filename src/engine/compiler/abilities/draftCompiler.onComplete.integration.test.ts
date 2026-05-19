import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint, createCartridge } from "../../test/factories";
import { createGameRuntime } from "../../runtime/createGameRuntime";
import type { RuntimeCommand } from "../../runtime/types";
import { RuntimeCommandType } from "../../runtime/types";

const makeBlueprint = () =>
    createBlueprint("bp_cave", {
        _editor: {
            abilities: {
                cycle: {
                    maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
                    costMultPerCycle: 0,
                    inputs: {},
                    oneOff: false,
                    conditions: [],
                    startActive: false,
                },
                draft: [
                    {
                        poolId: "tier_1_pool",
                        count: 3,
                        conditions: [],
                        onComplete: [{ type: "KILL", entityId: "self" }],
                    },
                ],
            },
        },
    });

describe("draftCompiler integration onComplete", () => {
    it("preserves onComplete through behavior execution", () => {
        const compiled = new CompilerService().compile(makeBlueprint());
        const runtime = createGameRuntime(createCartridge("test.cave"), "seed");
        const captured: RuntimeCommand[] = [];

        runtime.registerCommandHandler({
            type: RuntimeCommandType.TRIGGER_DRAFT,
            handle: (command) => captured.push(command),
        });
        runtime.addEntity({
            id: "cave_entity",
            state: { cycle: { value: 10, max: 10 } },
            behavior: compiled.components.behavior,
        });

        runtime.tick(40);

        expect(captured[0]).toMatchObject({
            type: RuntimeCommandType.TRIGGER_DRAFT,
            payload: {
                poolId: "tier_1_pool",
                triggerEntityId: "cave_entity",
                onComplete: [{ type: "KILL", entityId: "self" }],
            },
        });
    });
});
