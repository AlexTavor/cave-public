import type { VeinGraph, VeinNode } from "./types";
import type { PowerSinkComponent } from "../../../data/schemas/components";
import {
  RESOURCE_ATTRIBUTES,
  DEMAND_TAGS,
  addNode,
  type ResourceAttribute,
} from "./graphBuilderCommon";
import type { VeinGraphSource } from "./veinGraphSource";
import { pushVeinEdge } from "./graphBuilderEdgeFactory";
import { addSinkDemandEdge, hasSinkDemand } from "./graphBuilderSinkEdges";
import { resolveAncestorPath } from "./parentVeinRouting";

const addDemandRoute = (
  source: VeinGraphSource,
  graphBuffer: VeinGraph,
  sourceNode: VeinNode,
  entityId: string,
  attribute: ResourceAttribute,
): void => {
  const route = [...resolveAncestorPath(source, entityId)].reverse();
  let current = sourceNode;
  for (const nodeId of [...route, entityId]) {
    const next = addNode(source, graphBuffer.nodes, nodeId);
    if (!next) continue;
    pushVeinEdge(graphBuffer, {
      sourceId: current.id,
      targetId: next.id,
      kind: "resource-demand",
      attribute,
      power: 1,
      sourceRadius: current.radius,
    });
    current = next;
  }
};

export const addDemandEdges = (
  source: VeinGraphSource,
  graphBuffer: VeinGraph,
  worldNode: VeinNode,
): void => {
  (Object.keys(DEMAND_TAGS) as ResourceAttribute[]).forEach((attribute) => {
    const demandTag = DEMAND_TAGS[attribute];
    for (const entity of source.query({ tag: demandTag })) {
      if (!entity.id) continue;
      addDemandRoute(source, graphBuffer, worldNode, entity.id, attribute);
    }
  });
};

export const addSinkEdges = (
  source: VeinGraphSource,
  graphBuffer: VeinGraph,
  worldNode: VeinNode,
): void => {
  for (const entity of source.getEntities()) {
    if (!entity.id || graphBuffer.nodes.has(entity.id)) continue;
    const sink = (entity as { powerSink?: PowerSinkComponent }).powerSink;
    if (!sink) continue;
    for (const attribute of RESOURCE_ATTRIBUTES) {
      if (!hasSinkDemand(sink, attribute)) continue;
      addSinkDemandEdge(
        attribute,
        sink.drawFraction?.[attribute] ?? 0,
        worldNode,
        source,
        graphBuffer,
        entity.id,
      );
    }
  }
};
