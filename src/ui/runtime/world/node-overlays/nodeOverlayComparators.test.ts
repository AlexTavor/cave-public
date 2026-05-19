import { describe, expect, it } from "vitest";
import {
    nodeOverlayBarIdentityEqual,
    nodeOverlayBarSnapshotEqual,
    nodeOverlayCardRenderEqual,
    nodeOverlayEntryEqual,
} from "./nodeOverlayComparators";

const baseBar = {
    id: "bar-1",
    entityId: "node-1",
    valuePath: "state.food",
    maxPath: "state.food.max",
    maxValue: 9,
    current: 3,
    max: 9,
    color: "#fff",
};

const liveBinding = {
    id: "node-overlay:text:storage:node-1",
    entityId: "node-1",
    kind: "compact-fraction" as const,
    valuePath: "state.food",
    maxPath: "state.food.max",
};

const makeEntry = (overrides = {}) => ({
    entityId: "node-1",
    kind: "storage" as const,
    label: "Food",
    valueText: "[3/9]",
    bar: baseBar,
    ...overrides,
});

const makeModel = (overrides = {}) => ({
    ...makeEntry(),
    position: { x: 10, y: 20 },
    ...overrides,
});

describe("nodeOverlayComparators", () => {
    it("splits bar identity equality from bar snapshot equality", () => {
        const changed = { ...baseBar, current: 4, max: 10 };
        expect(nodeOverlayBarIdentityEqual(baseBar, changed)).toBe(true);
        expect(nodeOverlayBarSnapshotEqual(baseBar, changed)).toBe(false);
    });

    it("ignores bar snapshots in semantic entry and card render equality", () => {
        const changed = { ...baseBar, current: 4, max: 10 };
        expect(
            nodeOverlayEntryEqual(makeEntry(), makeEntry({ bar: changed })),
        ).toBe(true);
        expect(
            nodeOverlayCardRenderEqual(
                makeModel(),
                makeModel({ bar: changed }),
            ),
        ).toBe(true);
    });

    it("keeps live text binding identity semantic", () => {
        const left = makeEntry({
            valueBinding: liveBinding,
            valueText: undefined,
        });
        const same = makeEntry({
            valueBinding: liveBinding,
            valueText: undefined,
        });
        const changedBinding = {
            ...liveBinding,
            id: "node-overlay:text:storage:node-9",
        };
        const changed = makeEntry({
            valueBinding: changedBinding,
            valueText: undefined,
        });
        expect(nodeOverlayEntryEqual(left, same)).toBe(true);
        expect(nodeOverlayEntryEqual(left, changed)).toBe(false);
        expect(
            nodeOverlayCardRenderEqual(
                makeModel({ valueBinding: liveBinding, valueText: undefined }),
                makeModel({
                    valueBinding: changedBinding,
                    valueText: undefined,
                }),
            ),
        ).toBe(false);
    });
});
