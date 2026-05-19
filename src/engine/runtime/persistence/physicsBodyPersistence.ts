import { PhysicsComponentSchema } from "../../../data/schemas/physics";
import { buildPhysicsBody } from "../handlers/spawnUtils";
import type { RuntimePersistenceTarget } from "./RuntimePersistenceTarget";
import type { PhysicsBody, PhysicsLayer } from "../../physics/impulse/types";
import type { SerializedPhysicsBody } from "./types";

export const serializePhysicsBody = (
  runtime: RuntimePersistenceTarget,
  entityId: string,
): SerializedPhysicsBody | null => {
  const body = runtime.getPhysicsBody(entityId);
  if (!body) return null;
  return {
    x: body.position.x,
    y: body.position.y,
    velocity: {
      x: body.position.x - body.prevPosition.x,
      y: body.position.y - body.prevPosition.y,
    },
    acceleration: { ...body.acceleration },
    targetId: body.targetId,
    layer: body.layer,
  };
};

export const syncPhysicsBody = (
  body: PhysicsBody,
  serialized: SerializedPhysicsBody,
): void => {
  body.position.x = serialized.x;
  body.position.y = serialized.y;
  body.x = serialized.x;
  body.y = serialized.y;
  body.prevPosition.x = serialized.x - serialized.velocity.x;
  body.prevPosition.y = serialized.y - serialized.velocity.y;
  body.acceleration.x = serialized.acceleration.x;
  body.acceleration.y = serialized.acceleration.y;
  if (serialized.targetId !== undefined) body.targetId = serialized.targetId;
  if (serialized.layer !== undefined)
    body.layer = serialized.layer as PhysicsLayer;
};

export const restorePhysicsBody = (
  runtime: RuntimePersistenceTarget,
  entityId: string,
  serialized: SerializedPhysicsBody,
): boolean => {
  let body = runtime.getPhysicsBody(entityId);
  if (!body) {
    const entity = runtime.getEntity(entityId);
    if (!entity) return false;
    const result = PhysicsComponentSchema.safeParse(
      (entity as { physics?: unknown }).physics,
    );
    if (!result.success) return false;
    body = buildPhysicsBody(entityId, result.data);
    runtime.registerPhysicsBody(body);
  }
  syncPhysicsBody(body, serialized);
  return true;
};
