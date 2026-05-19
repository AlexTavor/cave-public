import { clearPhaserDebugSnapshot } from "../debug/phaserDebugStats";
import { destroyGameDisplaySystem } from "./GameSceneDisplayInit";
import { destroyPointerSceneSystems } from "./GameScene.pointer";
import type { GameSceneLike } from "./GameScene.types";

export const destroyGameSceneResources = (scene: GameSceneLike): void => {
  clearPhaserDebugSnapshot(scene.debugSceneId);
  scene.backgroundSystem?.destroy();
  destroyGameDisplaySystem(scene.displaySystem);
  scene.textureManager?.destroy();
  scene.veinsSystem?.clear();
  scene.cameraController.destroy();
  scene.entityDragController.destroy();
  destroyPointerSceneSystems(scene);
};
