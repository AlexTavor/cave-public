import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint, createCartridge } from "../../test/factories";
import { createGameRuntime } from "../../runtime/createGameRuntime";
import { RuntimeCommandType } from "../../runtime/types";
import type { RuntimeCommand } from "../../runtime/types";

const makeDraftBlueprint = () =>
    createBlueprint("bp_cave", {
        components: {},
        _editor: {
            abilities: {
                cycle: {
                    maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
                    costMultPerCycle: 0,
                    inputs: {},
                    oneOff: false,
                    conditions: [],
                },
                draft: [
                    {
                        poolId: "tier_1_pool",
                        count: 3,
                        label: "Choose an upgrade",
                        conditions: [],
                    },
                ],
            },
        },
    });

const captureHandler = (buffer: RuntimeCommand[]) => ({
    type: RuntimeCommandType.TRIGGER_DRAFT,
    handle: (cmd: RuntimeCommand) => buffer.push(cmd),
});

describe("draftCompiler integration", () => {
    it("compiles draft ability and runtime emits TRIGGER_DRAFT", () => {
        // Given – compiled blueprint with cycle at max
        const compiled = new CompilerService().compile(makeDraftBlueprint());
        const runtime = createGameRuntime(createCartridge("test.cave"), "seed");
        const captured: RuntimeCommand[] = [];
        runtime.registerCommandHandler(captureHandler(captured));

        runtime.addEntity({
            id: "cave_entity",
            state: { cycle: { value: 10, max: 10 } },
            behavior: compiled.components.behavior,
        });

        // When – tick twice (emit substep + process substep)
        runtime.tick(40);

        // Then – TRIGGER_DRAFT was dispatched with the correct payload
        const draftCommand = captured.find(
            (c) => c.type === RuntimeCommandType.TRIGGER_DRAFT,
        );
        expect(draftCommand).toBeDefined();
        expect(draftCommand).toMatchObject({
            type: RuntimeCommandType.TRIGGER_DRAFT,
            payload: {
                poolId: "tier_1_pool",
                count: 3,
                label: "Choose an upgrade",
                triggerEntityId: "cave_entity",
            },
        });
    });

    it("compiles draft rule id using poolId and index", () => {
        // Given
        const compiled = new CompilerService().compile(makeDraftBlueprint());
        const rules = compiled.components.behavior?.rules ?? [];

        // Then – rule is present with correct id and sort key
        const draftRule = rules.find((r) => r.id?.startsWith("sys_draft_"));
        expect(draftRule).toBeDefined();
        expect(draftRule?.id).toBe("sys_draft_tier_1_pool_0");
        expect(draftRule?.sortKey).toBe("sys_070");
    });
});
