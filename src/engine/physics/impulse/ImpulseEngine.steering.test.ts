import { describe, it, expect } from "vitest";
import { ImpulseEngine } from "./ImpulseEngine";
import type { PhysicsBody, Vector2 } from "./types";
import type { ImpulseConfig } from "../../../data/schemas/physics";
import { getVelocityProxy } from "./ImpulseSteeringMath";
import type { ImpulseForceField } from "./ImpulseForceField";
import { createImpulseConfig } from "../../test/factories";
import { standardDeviation } from "../../test/mathUtils";

const makeConfig = (overrides: Partial<ImpulseConfig> = {}): ImpulseConfig =>
  createImpulseConfig(overrides);

const makeBody = (params: {
  id: string;
  position: Vector2;
  prevPosition?: Vector2;
  isStatic?: boolean;
  radius?: number;
}): PhysicsBody => {
  const prev = params.prevPosition ?? params.position;
  return {
    id: params.id,
    entity: params.id,
    x: params.position.x,
    y: params.position.y,
    mass: 1,
    radius: params.radius ?? 4,
    drag: 0.1,
    position: { ...params.position },
    prevPosition: { ...prev },
    acceleration: { x: 0, y: 0 },
    isStatic: params.isStatic ?? false,
  };
};

const runTicks = (engine: ImpulseEngine, steps: number): void => {
  for (let i = 0; i < steps; i += 1) {
    engine.tick(16 / 1000);
  }
};

const computeAverageHeading = (angles: number[]): number => {
  const avgX = angles.reduce((sum, a) => sum + Math.cos(a), 0) / angles.length;
  const avgY = angles.reduce((sum, a) => sum + Math.sin(a), 0) / angles.length;
  return Math.atan2(avgY, avgX);
};

const buildCorridorWalls = (
  count: number,
  startX: number,
  spacing: number,
): PhysicsBody[] =>
  Array.from({ length: count }, (_, i) => [
    makeBody({
      id: `top-${i}`,
      position: { x: startX + i * spacing, y: 15 },
      isStatic: true,
      radius: 5,
    }),
    makeBody({
      id: `bottom-${i}`,
      position: { x: startX + i * spacing, y: -15 },
      isStatic: true,
      radius: 5,
    }),
  ]).flat();

describe("ImpulseEngine steering integration", () => {
  it("routes around a blocking wall", () => {
    const config = makeConfig({
      avoidanceForce: 8, // Increased for robust steering
      lookAheadDistance: 60, // Increased for earlier detection
      separationStrength: 0,
      alignmentWeight: 0,
      cohesionWeight: 0,
      flockingRadius: 0,
    });
    const engine = new ImpulseEngine(config);
    const agent = makeBody({
      id: "agent",
      position: { x: 0, y: 0 },
      prevPosition: { x: -1, y: 0 },
      radius: 2,
    });
    const target = makeBody({
      id: "target",
      position: { x: 100, y: 0 },
      isStatic: true,
      radius: 4,
    });
    const wall = [
      makeBody({
        id: "wall-1",
        position: { x: 40, y: -8 },
        isStatic: true,
        radius: 6,
      }),
      makeBody({
        id: "wall-2",
        position: { x: 40, y: 0 },
        isStatic: true,
        radius: 6,
      }),
      makeBody({
        id: "wall-3",
        position: { x: 40, y: 8 },
        isStatic: true,
        radius: 6,
      }),
    ];

    engine.addBody(agent);
    engine.addBody(target);
    wall.forEach((body) => engine.addBody(body));
    engine.setTarget(agent.id, target.id);

    runTicks(engine, 80);

    const moved = engine.getBody(agent.id);
    expect(moved).toBeDefined();
    expect(moved?.position.x).toBeGreaterThan(50);
    expect(Math.abs(moved?.position.y ?? 0)).toBeGreaterThan(1);
  });

  it("aligns headings into a river", () => {
    const config = makeConfig({
      avoidanceForce: 0,
      lookAheadDistance: 0,
      separationStrength: 0,
      alignmentWeight: 1.2,
      cohesionWeight: 0.3,
      flockingRadius: 80,
    });
    const engine = new ImpulseEngine(config);
    const target = makeBody({
      id: "target",
      position: { x: 200, y: 0 },
      isStatic: true,
      radius: 4,
    });
    engine.addBody(target);

    const agents = [
      makeBody({
        id: "agent-1",
        position: { x: 0, y: 0 },
        prevPosition: { x: -1, y: 1 },
      }),
      makeBody({
        id: "agent-2",
        position: { x: 0, y: 5 },
        prevPosition: { x: -1, y: 6 },
      }),
      makeBody({
        id: "agent-3",
        position: { x: 0, y: 10 },
        prevPosition: { x: -1, y: 9 },
      }),
      makeBody({
        id: "agent-4",
        position: { x: 0, y: 15 },
        prevPosition: { x: -1, y: 14 },
      }),
      makeBody({
        id: "agent-5",
        position: { x: 0, y: 20 },
        prevPosition: { x: -1, y: 21 },
      }),
    ];

    agents.forEach((body) => {
      engine.addBody(body);
      engine.setTarget(body.id, target.id);
    });

    const initialAngles = agents.map((body) => {
      const v = getVelocityProxy(body);
      return Math.atan2(v.y, v.x);
    });
    const initialStd = standardDeviation(initialAngles);

    runTicks(engine, 120);

    const finalAngles = agents.map((body) => {
      const current = engine.getBody(body.id) as PhysicsBody;
      const v = getVelocityProxy(current);
      return Math.atan2(v.y, v.x);
    });
    const finalStd = standardDeviation(finalAngles);
    const finalHeading = computeAverageHeading(finalAngles);

    expect(finalStd).toBeLessThan(initialStd + 0.25);
    expect(Math.abs(finalHeading)).toBeLessThan(Math.PI / 6);
  });

  it("navigates a corridor without deadlock", () => {
    const config = makeConfig({
      avoidanceForce: 3,
      lookAheadDistance: 30,
      separationStrength: 0,
      alignmentWeight: 0,
      cohesionWeight: 0,
      flockingRadius: 0,
    });
    const engine = new ImpulseEngine(config);
    const agent = makeBody({
      id: "agent",
      position: { x: 0, y: 0 },
      prevPosition: { x: -1, y: 0 },
      radius: 2,
    });
    const target = makeBody({
      id: "target",
      position: { x: 120, y: 0 },
      isStatic: true,
    });

    const walls = buildCorridorWalls(7, 20, 10);

    engine.addBody(agent);
    engine.addBody(target);
    walls.forEach((wall) => engine.addBody(wall));
    engine.setTarget(agent.id, target.id);

    runTicks(engine, 120);

    const moved = engine.getBody(agent.id) as PhysicsBody;
    expect(moved.position.x).toBeGreaterThan(40);
    expect(Math.abs(moved.position.y)).toBeLessThan(15);
  });

  it("prioritizes avoidance over external fields", () => {
    const config = makeConfig({
      avoidanceForce: 4,
      lookAheadDistance: 30,
      separationStrength: 0,
      alignmentWeight: 0,
      cohesionWeight: 0,
      flockingRadius: 0,
    });
    const engine = new ImpulseEngine(config);
    const agent = makeBody({
      id: "agent",
      position: { x: 0, y: 0 },
      prevPosition: { x: -1, y: 0 },
      radius: 2,
    });
    const obstacle = makeBody({
      id: "wall",
      position: { x: 20, y: 0 },
      isStatic: true,
      radius: 6,
    });

    const pushField: ImpulseForceField = () => ({ x: 3, y: 0 });

    engine.addBody(agent);
    engine.addBody(obstacle);
    engine.setExternalForceFields([pushField]);

    runTicks(engine, 60);

    const moved = engine.getBody(agent.id) as PhysicsBody;
    const dx = moved.position.x - obstacle.position.x;
    const dy = moved.position.y - obstacle.position.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = moved.radius + obstacle.radius - 0.5;

    expect(distance).toBeGreaterThan(minDistance);
  });

  it("does not apply separation force from the assigned target", () => {
    const config = makeConfig({
      separationStrength: 100, // Strong separation
      separationRadiusMultiplier: 2,
      defaultQueryRadius: 50,
      seekStrength: 1,
    });
    const engine = new ImpulseEngine(config);

    const agent = makeBody({
      id: "agent",
      position: { x: 0, y: 0 },
      radius: 5,
    });

    // Target is placed so it overlaps, which would normally cause strong repulsion
    // We set isStatic: false to ensure ObstacleAvoidance doesn't interfere,
    // allowing us to isolate and test the Separation logic.
    const target = makeBody({
      id: "target",
      position: { x: 8, y: 0 }, // 8 < (5+5)
      radius: 5,
      isStatic: false,
    });

    engine.addBody(agent);
    engine.addBody(target);
    engine.setTarget(agent.id, target.id);

    // Tick simulation
    runTicks(engine, 5);

    const updatedAgent = engine.getBody(agent.id);

    // If separation was active: Repulsion (Left) > Seek (Right) => x < 0
    // If separation is excluded: Seek (Right) => x > 0
    expect(updatedAgent?.position.x).toBeGreaterThan(0);
  });
});
