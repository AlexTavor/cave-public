import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../../engine/test/factories";
import { CompilerService } from "../../../engine/compiler/CompilerService";
import { PassiveEffectsSystem } from "./PassiveEffectSystem";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { ImpulseEngine } from "../../../engine/physics/impulse/ImpulseEngine";
import type {
    RuntimeCommand,
    RuntimeEntity,
} from "../../../engine/runtime/types";

type KeyedPayload = { key?: string; value?: number };
const payloadOf = (command: RuntimeCommand) =>
    (command as { payload?: KeyedPayload }).payload;

const compileEntity = () => {
    const blueprint = createBlueprint("heater", {
        _editor: {
            abilities: {
                storage: [
                    {
                        resource: "heat",
                        capacity: { base: 10, perBody: 0, multPerBody: 0 },
                        entropy: { base: 2, perBody: 0, multPerBody: 0 },
                        visible: true,
                        allowDeposit: true,
                        allowWithdraw: true,
                        priority: 0,
                    },
                ],
            },
        },
    });
    const compiled = new CompilerService().compile(blueprint);
    return {
        id: "heater_1",
        ...compiled.components,
        state: {
            ...compiled.components.state,
            heat: { value: 10, max: 10, visible: true },
        },
    } as unknown as RuntimeEntity;
};

const tickDecay = (dt: number) => {
    const commands: RuntimeCommand[] = [];
    const snapshot = new Snapshot([compileEntity()], {
        getBody: () => undefined,
    } as unknown as ImpulseEngine);
    new PassiveEffectsSystem().tick(
        snapshot,
        {
            enqueue: (command: RuntimeCommand) => commands.push(command),
            drain: () => [],
            clear: () => undefined,
            size: () => commands.length,
        },
        dt,
    );
    const match = [...commands]
        .reverse()
        .find((command) => {
            const payload = payloadOf(command);
            return payload?.key === "heat" && typeof payload?.value === "number";
        });
    return match ? payloadOf(match)?.value : undefined;
};

describe("storage decay timing", () => {
    it("decays by seconds over a full second", () => {
        expect(tickDecay(1000)).toBe(8);
    });

    it("decays fractionally for a partial second", () => {
        expect(tickDecay(20)).toBeCloseTo(9.96);
    });
});
