import { describe, expect, it } from "vitest";
import { buildVeinGraph } from "./graphBuilderUtils";
import { Snapshot } from "../../runtime/Snapshot";
import { ImpulseEngine } from "../../physics/impulse/ImpulseEngine";
import { createImpulseConfig } from "../../test/factories";

const makePhysics = (ids: string[]) => {
    const engine = new ImpulseEngine(createImpulseConfig());
    for (const id of ids)
        engine.addBody({
            id,
            entity: id,
            x: 0,
            y: 0,
            mass: 1,
            radius: 10,
            drag: 0,
            position: { x: 0, y: 0 },
            prevPosition: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            isStatic: false,
        });
    return engine;
};

describe("buildVeinGraph one-off sinks", () => {
    it("skips depleted sinks once demand is zeroed", () => {
        const snapshot = new Snapshot(
            [
                { id: "sys_world" } as any,
                {
                    id: "egg_1",
                    state: { is_depleted: { value: 1 } },
                    powerSink: {
                        baseDemand: { body: 0, mind: 0, social: 0 },
                        maxDemand: { body: 0, mind: 0, social: 0 },
                        allocatedDraw: { body: 0, mind: 0, social: 0 },
                        throttle: 0,
                        efficiency: 0,
                        drawFraction: {},
                        status: "blackout",
                    },
                } as any,
            ],
            makePhysics(["sys_world", "egg_1"]),
        );
        const graph = { nodes: new Map(), edges: [] as any[] };

        buildVeinGraph(snapshot, graph as any);

        expect(
            graph.edges.find((edge) => edge.targetId === "egg_1"),
        ).toBeUndefined();
    });
});
