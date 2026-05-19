import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { CompilerService } from "../CompilerService";
import { PassiveEffectsSystem } from "../../../game/systems/passive-effects/PassiveEffectSystem";
import { Snapshot } from "../../runtime/Snapshot";

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
        } as any,
    });
    const compiled = new CompilerService().compile(blueprint);
    return {
        id: "heater_1",
        ...compiled.components,
        state: {
            ...compiled.components.state,
            heat: { value: 10, max: 10, visible: true },
        },
    } as any;
};

const tickDecay = (dt: number) => {
    const commands: any[] = [];
    const snapshot = new Snapshot([compileEntity()], {
        getBody: () => undefined,
    } as any);
    new PassiveEffectsSystem().tick(
        snapshot,
        {
            enqueue: (c: any) => commands.push(c),
            drain: () => [],
            clear: () => undefined,
            size: () => commands.length,
        },
        dt,
    );
    return [...commands]
        .reverse()
        .find(
            (c) =>
                c.payload?.key === "heat" &&
                typeof c.payload?.value === "number",
        )?.payload?.value;
};

describe("storage decay timing", () => {
    it("decays by seconds over a full second", () => {
        expect(tickDecay(1000)).toBe(8);
    });

    it("decays fractionally for a partial second", () => {
        expect(tickDecay(20)).toBeCloseTo(9.96);
    });
});
