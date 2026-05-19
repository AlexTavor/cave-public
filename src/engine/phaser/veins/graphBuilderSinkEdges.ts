import type { PowerSinkComponent } from "../../../data/schemas/components";
import type { VeinGraph, VeinNode } from "./types";
import type { VeinGraphSource } from "./veinGraphSource";
import type { ResourceAttribute } from "./graphBuilderCommon";
import { addNode } from "./graphBuilderCommon";
import { pushVeinEdge } from "./graphBuilderEdgeFactory";
import { resolveAncestorPath } from "./parentVeinRouting";

export const hasSinkDemand = (
  sink: PowerSinkComponent,
  attribute: ResourceAttribute,
): boolean =>
  (sink.baseDemand?.[attribute] ?? 0) > 0 ||
  (sink.maxDemand?.[attribute] ?? 0) > 0 ||
  (sink.allocatedDraw?.[attribute] ?? 0) > 0;

export const addSinkDemandEdge = (
  attribute: ResourceAttribute,
  drawFraction: number,
  worldNode: VeinNode,
  source: VeinGraphSource,
  graphBuffer: VeinGraph,
  entityId: string,
): void => {
  let current = worldNode;
  const route = [...resolveAncestorPath(source, entityId)].reverse();
  for (const nodeId of [...route, entityId]) {
    const next = addNode(source, graphBuffer.nodes, nodeId);
    if (!next) continue;
    pushVeinEdge(graphBuffer, {
      sourceId: current.id,
      targetId: next.id,
      kind: "resource-demand",
      attribute,
      power: 1,
      drawFraction,
      sourceRadius: current.radius,
    });
    current = next;
  }
};
