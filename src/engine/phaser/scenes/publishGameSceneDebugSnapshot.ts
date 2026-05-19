import type { Runtime } from "../../runtime/Runtime";
import type { GameDisplaySystem } from "./GameSceneDisplayInit";
import { getPhaserDebugEnabled } from "../debug/phaserDebugToggle";
import type { TextureManager } from "../utils/TextureManager";
import { publishPhaserDebugSnapshot } from "../debug/phaserDebugStats";

export const publishGameSceneDebugSnapshot = (params: {
    sceneId: string;
    scene: Phaser.Scene;
    runtime: Runtime | null;
    displaySystem: GameDisplaySystem | null;
    textureManager?: TextureManager;
}): void => {
    if (!getPhaserDebugEnabled()) return;
    const { sceneId, scene, runtime, displaySystem, textureManager } = params;
    const previousSnapshotReady = Boolean((runtime as any)?.previousSnapshot);
    const veinEdgeCount = (scene as any).veinsSystem?.graph?.edges?.length;

    publishPhaserDebugSnapshot({
        sceneId,
        sceneKey: scene.scene.key,
        updatedAtMs: performance.now(),
        runtime: runtime
            ? {
                  id: runtime.id,
                  tick: runtime.getState().tick,
                  status: runtime.getState().status,
                  entityCount: runtime.getEntityCount(),
                  accumulatedTime: runtime.getAccumulatedTime(),
              }
            : null,
        display: displaySystem?.displayManager.getStats() ?? null,
        textures: textureManager?.getStats() ?? null,
        phaser: {
            displayListCount: scene.children.list.length,
            tweenCount: scene.tweens.getTweens().length,
        },
        runtimeDebug: { previousSnapshotReady },
        veins: { edgeCount: veinEdgeCount ?? 0 },
    } as any);
};
