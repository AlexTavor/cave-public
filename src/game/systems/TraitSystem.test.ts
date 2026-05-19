import { describe, it, expect, vi } from "vitest";
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

describe("TraitSystem", () => {
    it("expires trait when remainingSeconds depletes", () => {
        const index: TraitIndex = {
            burn: { id: "burn", label: "Burn" },
        };
        const system = new TraitSystem(index);
        const entity = {
            id: "e1",
            traits: [{ id: "burn", remainingSeconds: 0.5 }],
        };
        const buf = makeBuffer();

        system.tick(makeSnapshot([entity]), buf, 1000);

        const update = buf.commands.find(
            (c: any) => c.type === RuntimeCommandType.UPDATE_TRAITS_BATCH,
        );
        expect(update.payload.updates[0].traits).toEqual([]);
    });

    it("warns and skips unknown trait id", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const system = new TraitSystem({});
        const entity = { id: "e1", traits: [{ id: "nope" }] };
        const buf = makeBuffer();

        system.tick(makeSnapshot([entity]), buf, 1000);

        expect(spy).toHaveBeenCalledWith(expect.stringContaining("nope"));
        spy.mockRestore();
    });
});
