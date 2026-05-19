import type { VeinGraph, VeinNode } from "./types";
import { addNode } from "./graphBuilderCommon";
import type { VeinGraphSource } from "./veinGraphSource";
import { pushVeinEdge } from "./graphBuilderEdgeFactory";
import { resolveAncestorPath } from "./parentVeinRouting";
import { PASSPORT_NERVOUS_VEIN_TAG } from "../../../data/schemas/abilities/passport";

const hasPassportNervousVein = (entity: Record<string, unknown>): boolean =>
  Array.isArray(entity.tags) && entity.tags.includes(PASSPORT_NERVOUS_VEIN_TAG);

const addWorldEdge = (
  graphBuffer: VeinGraph,
  sourceNode: VeinNode,
  targetNode: VeinNode,
): void => {
  pushVeinEdge(graphBuffer, {
    sourceId: sourceNode.id,
    targetId: targetNode.id,
    kind: "nervous",
    attribute: "nervous",
    power: 1,
    sourceRadius: sourceNode.radius,
  });
};

const addWorldRoute = (
  source: VeinGraphSource,
  graphBuffer: VeinGraph,
  worldNode: VeinNode,
  entityId: string,
): void => {
  const route = [...resolveAncestorPath(source, entityId)].reverse();
  let current = worldNode;
  for (const nodeId of [...route, entityId]) {
    if (nodeId === current.id) continue;
    const next = addNode(source, graphBuffer.nodes, nodeId);
    if (!next) continue;
    addWorldEdge(graphBuffer, current, next);
    current = next;
  }
};

const collectNervousRouteIds = (source: VeinGraphSource): string[] => {
  const ids = new Set<string>();
  source.getEntities().forEach((entity) => {
    const id = typeof entity.id === "string" ? entity.id : null;
    if (!id) return;
    if (hasPassportNervousVein(entity)) ids.add(id);
  });
  return [...ids];
};

export const addNervousEdges = (
  source: VeinGraphSource,
  graphBuffer: VeinGraph,
  worldNode: VeinNode,
): void => {
  collectNervousRouteIds(source).forEach((entityId) => {
    addWorldRoute(source, graphBuffer, worldNode, entityId);
  });
};
