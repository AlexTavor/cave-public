import type { VeinAttribute, VeinNode } from "./types";
import type { VeinGraphSource } from "./veinGraphSource";

export type ResourceAttribute = Exclude<VeinAttribute, "nervous">;

export const RESOURCE_ATTRIBUTES: ResourceAttribute[] = [
  "body",
  "mind",
  "social",
];

export const DEMAND_TAGS: Record<ResourceAttribute, string> = {
  body: "demand:body",
  mind: "demand:mind",
  social: "demand:social",
};

export const addNode = (
  source: VeinGraphSource,
  nodes: Map<string, VeinNode>,
  id: string,
): VeinNode | null => {
  const body = source.getPhysicsBody(id);
  if (!body) return null;
  const node = {
    id,
    x: body.position.x,
    y: body.position.y,
    radius: body.radius,
  };
  nodes.set(id, node);
  return node;
};
