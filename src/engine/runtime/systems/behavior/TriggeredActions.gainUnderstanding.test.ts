import { describe, expect, it } from "vitest";
import { CompilerService } from "../../../compiler/CompilerService";
import { createBlueprint } from "../../../test/factories";
import { BehaviorSystem } from "../BehaviorSystem";
import { Snapshot } from "../../Snapshot";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import { RuntimeCommandType, type RuntimeCommand } from "../../types";

describe("TriggeredActions gain understanding", () => {
    it("emits GAIN_UNDERSTANDING through the behavior action pipeline", () => {
        const compiled = new CompilerService().compile(
            createBlueprint("bp", {
                components: {},
                _editor: {
                    abilities: {
                        triggeredActions: [
                            {
                                id: "ta-1",
                                triggers: ["assignment_complete"],
                                conditions: [],
                                actions: [
                                    {
                                        type: "GAIN_UNDERSTANDING",
                                        understandingId: "insight",
                                    },
                                ],
                            },
                        ],
                    },
                },
            }),
        );
        const commands: RuntimeCommand[] = [];
        new BehaviorSystem().tick(
            new Snapshot(
                [
                    { id: "sys_world", state: {} } as any,
                    {
                        id: "actor",
                        state: { assignment_complete_pulse: { value: 1 } },
                        behavior: compiled.components.behavior,
                    } as any,
                ],
                new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
            ),
            {
                enqueue: (c: RuntimeCommand) => commands.push(c),
                drain: () => [],
                clear: () => undefined,
                size: () => commands.length,
            },
            16,
        );

        expect(commands).toContainEqual(
            expect.objectContaining({
                type: RuntimeCommandType.GAIN_UNDERSTANDING,
                payload: { entityId: "sys_world", understandingId: "insight" },
            }),
        );
    });
});
