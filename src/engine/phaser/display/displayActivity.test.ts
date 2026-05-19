import { describe, expect, it } from "vitest";
import { isDisplayActive } from "./displayActivity";

const makeCycleEntity = (overrides: Record<string, unknown> = {}) =>
    ({
        id: "cycle-1",
        state: {
            cycle: { value: 5, max: 10 },
            cycle_active: { value: 1 },
            is_depleted: { value: 0 },
        },
        powerSink: { status: "nominal", allocatedDraw: { body: 1 } },
        ...overrides,
    }) as any;

const makeEntity = (
    id: string,
    parentId?: string,
    overrides: Record<string, unknown> = {},
) =>
    ({
        id,
        ...(parentId ? { parent: { parentId } } : {}),
        state: {},
        ...overrides,
    }) as any;

const makeRuntime = (...entities: any[]) =>
    ({ getEntities: () => entities }) as any;

describe("displayActivity", () => {
    it("keeps active cycle entities animating", () => {
        expect(isDisplayActive(makeCycleEntity(), null)).toBe(true);
    });

    it("stops animation during blackout", () => {
        expect(
            isDisplayActive(
                makeCycleEntity({ powerSink: { status: "blackout" } }),
                null,
            ),
        ).toBe(false);
    });

    it("stops animation for depleted one-off entities", () => {
        expect(
            isDisplayActive(
                makeCycleEntity({
                    state: {
                        cycle: { value: 5, max: 10 },
                        is_depleted: { value: 1 },
                    },
                }),
                null,
            ),
        ).toBe(false);
    });

    it("keeps a parent entity active when a descendant subtree has positive allocated draw", () => {
        const runtime = makeRuntime(
            makeEntity("root"),
            makeEntity("sink", "root", {
                powerSink: { allocatedDraw: { body: 1 } },
            }),
        );
        expect(isDisplayActive(makeEntity("root"), runtime)).toBe(true);
    });

    it("stops a parent entity pulse when descendant subtree draw is zero", () => {
        const runtime = makeRuntime(
            makeEntity("root"),
            makeEntity("sink", "root", {
                powerSink: { allocatedDraw: { body: -1, mind: 0 } },
            }),
        );
        expect(isDisplayActive(makeEntity("root"), runtime)).toBe(false);
    });

    it("stops a non-storage non-cycle entity without power draw", () => {
        expect(
            isDisplayActive(
                makeEntity("solo", undefined, {
                    powerSink: { status: "blackout" },
                }),
                makeRuntime(),
            ),
        ).toBe(false);
    });

    it("counts deeper descendants, not only direct children", () => {
        const runtime = makeRuntime(
            makeEntity("root"),
            makeEntity("mid", "root"),
            makeEntity("sink", "mid", {
                powerSink: { allocatedDraw: { social: 2 } },
            }),
        );
        expect(isDisplayActive(makeEntity("root"), runtime)).toBe(true);
    });

    it("keeps storage entities active without power draw", () => {
        expect(
            isDisplayActive(
                makeEntity("store", undefined, {
                    tags: ["storage:coin"],
                    state: { coin: { value: 0, allowDeposit: true } },
                }),
                makeRuntime(),
            ),
        ).toBe(true);
    });

    it("keeps pending transfer entities active without power draw", () => {
        expect(
            isDisplayActive(
                makeEntity("pending", undefined, {
                    tags: ["pending_transfer"],
                }),
                makeRuntime(),
            ),
        ).toBe(true);
    });
});
