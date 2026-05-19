import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { PhysicsBody } from "../../../../engine/physics/impulse/types";
import { createRuntimeTestDouble } from "../testUtils";

export const makePhysicsBody = (
    id: string,
    x: number,
    y: number,
    radius = 10,
): PhysicsBody => ({
    id,
    entity: id,
    x,
    y,
    mass: 1,
    radius,
    drag: 0,
    position: { x, y },
    prevPosition: { x, y },
    acceleration: { x: 0, y: 0 },
    isStatic: true,
});

export const makeNodeOverlayRuntime = (
    entities: any[],
    bodies: Record<string, PhysicsBody> = {},
): Runtime =>
    ({
        getEntities: () => entities,
        getPhysicsBody: (id: string) => bodies[id],
        getCartridge: () => ({ blueprints: {} }),
    }) as unknown as Runtime;

export const createMutableNodeOverlayRuntime = (
    initialEntities: any[],
    initialBodies: Record<string, PhysicsBody> = {},
) => {
    const entities = [...initialEntities];
    const bodies = { ...initialBodies };
    const runtime = createRuntimeTestDouble({
        getEntities: () => entities,
        getPhysicsBody: (id: string) => bodies[id],
        getCartridge: () => ({ blueprints: {} }),
    });
    return { ...runtime, bodies, entities };
};
