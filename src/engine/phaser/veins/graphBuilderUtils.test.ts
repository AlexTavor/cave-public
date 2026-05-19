import { describe, it, expect } from "vitest";
import { buildVeinGraph } from "./graphBuilderUtils";
import { Snapshot } from "../../runtime/Snapshot";
import { ImpulseEngine } from "../../physics/impulse/ImpulseEngine";
import { createImpulseConfig } from "../../test/factories";
import type { RuntimeEntity } from "../../runtime/types";
import type { VeinGraph } from "./types";

const makeGraph = (): VeinGraph => ({
    nodes: new Map(),
    edges: [],
});

const makePhysics = (ids: string[]) => {
    const engine = new ImpulseEngine(createImpulseConfig());
    for (const id of ids) {
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
    }
    return engine;
};

describe("buildVeinGraph — sink edges", () => {
    it("creates edges from sys_world to a dynamic entity with powerSink", () => {
        const world: RuntimeEntity = { id: "sys_world" };
        const egg: RuntimeEntity = {
            id: "egg_1",
            powerSink: {
                baseDemand: { body: 1, mind: 0, social: 0 },
                maxDemand: { body: 1, mind: 0, social: 0 },
                throttle: 1,
                efficiency: 1,
                drawFraction: { body: 0.5 },
                status: "nominal",
            },
        };
        const physics = makePhysics(["sys_world", "egg_1"]);
        const snapshot = new Snapshot([world, egg], physics);
        const graph = makeGraph();

        buildVeinGraph(snapshot, graph);

        const sinkEdge = graph.edges.find(
            (edge) =>
                edge.sourceId === "sys_world" && edge.targetId === "egg_1",
        );

        expect(sinkEdge).toBeDefined();
        expect(sinkEdge).toMatchObject({
            attribute: "body",
            kind: "resource-demand",
        });
    });

    it("skips entities already added by demand tags", () => {
        const world: RuntimeEntity = { id: "sys_world" };
        const tagged: RuntimeEntity = {
            id: "mine_1",
            tags: ["demand:body"],
            powerSink: {
                baseDemand: { body: 1, mind: 0, social: 0 },
                maxDemand: { body: 1, mind: 0, social: 0 },
                throttle: 1,
                efficiency: 1,
                drawFraction: { body: 0.8 },
                status: "nominal",
            },
        };
        const physics = makePhysics(["sys_world", "mine_1"]);
        const snapshot = new Snapshot([world, tagged], physics);
        const graph = makeGraph();

        buildVeinGraph(snapshot, graph);

        const bodyEdges = graph.edges.filter(
            (edge) => edge.targetId === "mine_1" && edge.attribute === "body",
        );

        expect(bodyEdges).toHaveLength(1);
        expect(bodyEdges[0]?.kind).toBe("resource-demand");
    });
});

