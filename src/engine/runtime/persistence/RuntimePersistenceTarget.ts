import type { ModuleCartridge } from "../../../data/schemas/module";
import type { PhysicsBody } from "../../physics/impulse/types";
import type { RuntimeEntity, RuntimeState } from "../types";
import type { World } from "miniplex";

export interface RuntimePersistenceTarget {
  addEntity(entity: RuntimeEntity): void;
  getEntity(id: string): RuntimeEntity | undefined;
  getState(): RuntimeState;
  getWorld(): World<RuntimeEntity>;
  getPhysicsBody(id: string): PhysicsBody | undefined;
  registerPhysicsBody(body: PhysicsBody): void;
  getCartridge(): ModuleCartridge;
}
