import { describe, it, expect } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { TraitSystem } from "./TraitSystem";
import type { TraitIndex } from "./trait/traitTickUtils";

const makeSnapshot = (entities: any[]) =>
    new Snapshot(entities, { getBody: () => undefined } as any);

const makeBuffer = () => {
    const cmds: any[] = [];
    return {
        enqueue: (cmd: any) => cmds.push(cmd),
        drain: () => {
            const r = [...cmds];
            cmds.length = 0;
            return r;
        },
        clear: () => (cmds.length = 0),
        size: () => cmds.length,
        commands: cmds,
    };
};

describe("TraitSystem – cycles", () => {
    it("applies cycle effects with accumulator", () => {
        const index: TraitIndex = {
            regen: {
                id: "regen",
                label: "Regen",
                cycles: [
                    {
                        id: "heal",
                        periodSeconds: 1,
                        effects: [
                            {
                                op: "ADD" as any,
                                target: "self.state.hp.value",
                                value: 5,
                            },
                        ],
                    },
                ],
            },
        };
        const system = new TraitSystem(index);
        const entity = {
            id: "e1",
            state: { hp: { value: 10 } },
            traits: [{ id: "regen" }],
        };
        const buf = makeBuffer();

        system.tick(makeSnapshot([entity]), buf, 2500);

        const stateUpdates = buf.commands.filter(
            (c: any) => c.type === RuntimeCommandType.UPDATE_STATE,
        );
        expect(stateUpdates).toHaveLength(1);
        expect(stateUpdates[0].payload.value).toBe(20);
    });

    it("multi-triggers cycle when dt exceeds multiple periods", () => {
        const index: TraitIndex = {
            tick: {
                id: "tick",
                label: "Tick",
                cycles: [
                    {
                        id: "c",
                        periodSeconds: 1,
                        effects: [
                            {
                                op: "ADD" as any,
                                target: "self.state.counter.value",
                                value: 1,
                            },
                        ],
                    },
                ],
            },
        };
        const entity = {
            id: "e1",
            state: { counter: { value: 0 } },
            traits: [{ id: "tick" }],
        };
        const buf = makeBuffer();
        new TraitSystem(index).tick(makeSnapshot([entity]), buf, 3000);

        const stateCmd = buf.commands.find(
            (c: any) => c.type === RuntimeCommandType.UPDATE_STATE,
        );
        expect(stateCmd.payload.value).toBe(3);
    });
});
