import { describe, it, expect } from "vitest";
import { Snapshot } from "../Snapshot";
import { GlobalEffectsIndexer } from "./GlobalEffectsIndexer";
import { Op } from "../../../data/schemas/primitives";

const makeSnapshot = (entities: any[]) => {
    const mockPhysics = { getBody: () => undefined } as any;
    return new Snapshot(entities, mockPhysics);
};

const makeBuffer = () => ({
    enqueue: () => undefined,
    drain: () => [],
    clear: () => undefined,
    size: () => 0,
});

describe("GlobalEffectsIndexer", () => {
    it("indexes buffs by tag", () => {
        const indexer = new GlobalEffectsIndexer();
        const entity = {
            buffs: {
                buffs: [
                    {
                        targetTag: "X",
                        effects: [
                            {
                                op: Op.ADD,
                                target: "self.state.power.value",
                                value: 10,
                            },
                        ],
                    },
                ],
            },
        };
        const snapshot = makeSnapshot([entity]);

        indexer.tick(snapshot, makeBuffer(), 16);

        const results = indexer.getBuffsFor(["X"]);
        expect(results).toHaveLength(1);
        expect(results[0].value).toBe(10);
    });

    it("returns empty when no tags match", () => {
        const indexer = new GlobalEffectsIndexer();
        const snapshot = makeSnapshot([]);

        indexer.tick(snapshot, makeBuffer(), 16);

        expect(indexer.getBuffsFor(["Y"])).toHaveLength(0);
    });

    it("stacks buffs from multiple sources", () => {
        const indexer = new GlobalEffectsIndexer();
        const effects = [
            { op: Op.ADD, target: "self.state.hp.value", value: 1 },
        ];
        const snapshot = makeSnapshot([
            { buffs: { buffs: [{ targetTag: "X", effects }] } },
            { buffs: { buffs: [{ targetTag: "X", effects }] } },
        ]);

        indexer.tick(snapshot, makeBuffer(), 16);

        expect(indexer.getBuffsFor(["X"])).toHaveLength(2);
    });
});
