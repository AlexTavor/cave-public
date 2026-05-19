import type { VeinGraph } from "./types";
import type { VeinGraphSource } from "./veinGraphSource";
import { addDemandEdges, addSinkEdges } from "./graphBuilderEdges";
import { addNervousEdges } from "./graphBuilderNervous";
export type { ResourceAttribute } from "./graphBuilderCommon";
export {
  RESOURCE_ATTRIBUTES,
  DEMAND_TAGS,
  addNode,
} from "./graphBuilderCommon";
import { addNode } from "./graphBuilderCommon";

export const buildVeinGraph = (
  source: VeinGraphSource,
  graphBuffer: VeinGraph,
): void => {
  graphBuffer.nodes.clear();
  graphBuffer.edges.length = 0;
  const world = source.getEntity("sys_world");
  if (!world?.id) return;
  const worldNode = addNode(source, graphBuffer.nodes, world.id);
  if (!worldNode) return;
  addDemandEdges(source, graphBuffer, worldNode);
  addSinkEdges(source, graphBuffer, worldNode);
  addNervousEdges(source, graphBuffer, worldNode);
};
