import { describe, expect, it } from "vitest";
import { DEFAULT_VEIN_CONFIG } from "../../../data/schemas/assets";
import { VeinsSystem } from "./VeinsSystem";

const createRuntime = (assets: object = {}, status = "running") => {
    let snapshots = 0;
    const entities = new Map<string, Record<string, unknown>>();
    const runtime = {
        createSnapshot: () => {
            snapshots += 1;
            return {
                getEntity: () => undefined,
                getEntities: () => [],
                getPhysicsBody: () => undefined,
                query: () => [],
            };
        },
        getCartridge: () => ({ assets }),
        getState: () => ({ status }),
        getTimestep: () => 16,
        getEntities: () => [...entities.values()],
        getEntity: (id: string) => entities.get(id),
        getPhysicsBody: () => undefined,
        addEntity: (entity: Record<string, unknown>) => {
            entities.set(entity.id as string, entity);
        },
    };

    return { runtime, getSnapshots: () => snapshots, entities };
};

describe("VeinsSystem", () => {
    it("skips heartbeat snapshots when no rules are configured", () => {
        const { runtime, getSnapshots } = createRuntime();
        const system = new VeinsSystem();

        for (let index = 0; index < 20; index += 1) {
            system.update(runtime as never);
        }
        expect(getSnapshots()).toBe(0);
    });

    it("creates heartbeat snapshots on cadence when rules exist", () => {
        const { runtime, getSnapshots } = createRuntime({
            settings: {
                vein_network: {
                    ...DEFAULT_VEIN_CONFIG,
                    heartbeats: {
                        ...DEFAULT_VEIN_CONFIG.heartbeats,
                        rules: [
                            {
                                condition: { tokens: [{ t: "val", v: 1 }] },
                                preset: "healthy",
                            },
                        ],
                    },
                },
            },
        });
        const system = new VeinsSystem();

        for (let index = 0; index < 12; index += 1)
            system.update(runtime as never);
        expect(getSnapshots()).toBe(0);

        system.update(runtime as never);
        expect(getSnapshots()).toBe(1);
    });

    it("writes simulation running status into display data", () => {
        const { runtime, entities } = createRuntime({}, "paused");
        const system = new VeinsSystem();
        system.update(runtime as never);
        expect(entities.get("veins_display")?.veinsDisplayData).toMatchObject({
            isSimulationRunning: false,
        });
    });
});
