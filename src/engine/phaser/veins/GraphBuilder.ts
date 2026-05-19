import type { VeinGraph } from "./types";
import { buildVeinGraph } from "./graphBuilderUtils";
import type { VeinGraphSource } from "./veinGraphSource";

export class GraphBuilder {
    public build(source: VeinGraphSource, graphBuffer: VeinGraph): void {
        buildVeinGraph(source, graphBuffer);
    }
}

