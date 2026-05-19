import { describe, expect, it, vi } from "vitest";
import { tickInstanceSafe } from "./DisplayInstanceManagerTick";

const makeDeps = (runtime: any) =>
    ({
        pulseEngine: { getDemandPulse: () => 0.8 },
        getRuntime: () => runtime,
        getSelectedEntityId: () => null,
        selectEntity: vi.fn(),
    }) as any;

const makeInstance = () =>
    ({
        tick: vi.fn(),
        clearTutorialDeemphasis: vi.fn(),
        applyTutorialDeemphasis: vi.fn(),
        setTutorialInteractionBlocked: vi.fn(),
        setAttentionLightSuppressed: vi.fn(),
    }) as any;
const makeRuntime = (...entities: any[]) =>
    ({
        getEntities: () => entities,
        getEntity: (id: string) => entities.find((entity) => entity.id === id),
    }) as any;

describe("DisplayInstanceManagerTick", () => {
    it("passes a zero pulse to inactive cycle entities", () => {
        const instance = makeInstance();
        tickInstanceSafe(
            instance,
            makeDeps(null),
            { entityId: "cycle-1" } as any,
            {
                state: {
                    cycle: { value: 1, max: 2 },
                    is_depleted: { value: 1 },
                },
                powerSink: { status: "nominal" },
            } as any,
            100,
            16,
        );

        expect(instance.tick.mock.calls[0][4]).toBe(0);
    });

    it("passes a zero pulse to inactive parent entities when descendant draw is zero", () => {
        const instance = makeInstance();
        const runtime = makeRuntime(
            { id: "root", state: {} },
            {
                id: "sink",
                parent: { parentId: "root" },
                state: {},
                powerSink: { allocatedDraw: { body: 0 } },
            },
            { id: "sys_world", state: {} },
        );
        tickInstanceSafe(
            instance,
            makeDeps(runtime),
            { entityId: "root" } as any,
            { id: "root", state: {} } as any,
            100,
            16,
        );
        expect(instance.tick.mock.calls[0][4]).toBe(0);
    });

    it("passes the sampled pulse to parent entities when descendant draw is positive", () => {
        const instance = makeInstance();
        const runtime = makeRuntime(
            { id: "root", state: {} },
            {
                id: "sink",
                parent: { parentId: "root" },
                state: {},
                powerSink: { allocatedDraw: { mind: 1 } },
            },
            { id: "sys_world", state: {} },
        );
        tickInstanceSafe(
            instance,
            makeDeps(runtime),
            { entityId: "root" } as any,
            { id: "root", state: {} } as any,
            100,
            16,
        );
        expect(instance.tick.mock.calls[0][4]).toBe(0.8);
    });

    it("passes the sampled pulse to pending transfer entities", () => {
        const instance = makeInstance();
        tickInstanceSafe(
            instance,
            makeDeps(makeRuntime()),
            { entityId: "pending-1" } as any,
            {
                id: "pending-1",
                tags: ["pending_transfer"],
                transfer: {},
            } as any,
            100,
            16,
        );
        expect(instance.tick.mock.calls[0][4]).toBe(0.8);
    });
});
