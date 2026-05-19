import type {
    DisplayInitContext,
    DisplayTickContext,
    DisplayDestroyContext,
} from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import type { VeinsDisplayDataComponent } from "../../VeinsDisplayData";
import type { VeinEdgeVisualState } from "./veinsModuleTypes";
import type { ShapeKind } from "../../../utils/TextureManager";
import { LayerId } from "../../layers/LayerIds";
import { createEdgeState, disposeEdgeState } from "./veinsEdgeState";
import { tickEdge } from "./veinsEdgeTick";
import { resolvePowerShape } from "../attribute/attributePowerVisuals";
import { readVeinsAlpha } from "./veinsRuntimeAlpha";

const MODULE_ID = "VeinsModule";

const readVeinsData = (
    entity: Record<string, unknown>,
): VeinsDisplayDataComponent | null => {
    const data = entity.veinsDisplayData;
    if (!data || typeof data !== "object") return null;
    return data as VeinsDisplayDataComponent;
};

export const VeinsModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const { scene, layers, pools, spec, textureManager } = ctx;
        const container = scene.add.container(0, 0);
        layers.get(LayerId.Veins).add(container);
        const pool = pools.get(spec.display_key);
        const stateMap = new Map<string, VeinEdgeVisualState>();
        const textureKeys = new Map<ShapeKind, string>();
        const veinTextureKey = textureManager.getVeinStripTexture();

        const getTextureKey = (shape: ShapeKind): string => {
            const existing = textureKeys.get(shape);
            if (existing) return existing;
            const created = textureManager.getShapeTexture({
                shape,
                color: "#ffffff",
            });
            textureKeys.set(shape, created);
            return created;
        };

        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                const data = readVeinsData(tickCtx.entity);
                if (!data) {
                    container.setVisible(false);
                    return;
                }
                container.setVisible(true);
                container.setAlpha(readVeinsAlpha(tickCtx.scene));
                const simulationDeltaMs = data.isSimulationRunning
                    ? tickCtx.deltaMs
                    : 0;
                const activeIds = new Set(data.edges.map((e) => e.id));
                for (const [id, st] of stateMap) {
                    if (!activeIds.has(id)) {
                        disposeEdgeState(st, container, pool);
                        stateMap.delete(id);
                    }
                }
                for (const edge of data.edges) {
                    let st = stateMap.get(edge.id);
                    if (!st) {
                        st = createEdgeState(
                            scene,
                            pool,
                            container,
                            edge.intensity01,
                            veinTextureKey,
                        );
                        stateMap.set(edge.id, st);
                    }
                    const pulseTextureKey = getTextureKey(
                        resolvePowerShape(edge.veinType),
                    );
                    tickEdge(
                        st,
                        edge,
                        simulationDeltaMs,
                        scene,
                        pool,
                        veinTextureKey,
                        pulseTextureKey,
                    );
                }
            },
            destroy(_dCtx: DisplayDestroyContext): void {
                for (const [, st] of stateMap) {
                    disposeEdgeState(st, container, pool);
                }
                stateMap.clear();
                container.destroy();
            },
        };
    },
};
