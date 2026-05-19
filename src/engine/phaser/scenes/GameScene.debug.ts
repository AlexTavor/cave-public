import type { Runtime } from "../../runtime/Runtime";
import { publishGameSceneDebugSnapshot } from "./publishGameSceneDebugSnapshot";
import type { GameSceneLike } from "./GameScene.types";

export const publishDebugSnapshotIfNeeded = (
  scene: GameSceneLike,
  runtime: Runtime | null,
  lastDebugPublishMs: number,
): number => {
  const now = performance.now();
  if (now - lastDebugPublishMs < 500) return lastDebugPublishMs;
  publishGameSceneDebugSnapshot({
    sceneId: scene.debugSceneId,
    scene,
    runtime,
    displaySystem: scene.displaySystem,
    textureManager: scene.textureManager,
  });
  return now;
};
