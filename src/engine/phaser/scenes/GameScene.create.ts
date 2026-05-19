import { BiologicalFogBackground } from "../background/BiologicalFogBackground";
import { TextureManager } from "../utils/TextureManager";
import { VeinsSystem } from "../veins/VeinsSystem";
import { createGameDisplaySystem } from "./GameSceneDisplayInit";
import { attachPointerSceneSystems } from "./GameScene.pointer";
import type { GameSceneLike } from "./GameScene.types";

export const initializeGameScene = (scene: GameSceneLike) => {
  const backgroundSystem = new BiologicalFogBackground(scene);
  const textureManager = new TextureManager(scene);
  const veinsSystem = new VeinsSystem();
  const displaySystem = createGameDisplaySystem(
    scene,
    textureManager,
    veinsSystem,
    scene.readRuntime,
    scene.readSelectedEntityId,
    scene.onSelectEntity,
    scene.readShouldRenderEntity,
  );
  attachPointerSceneSystems(scene, scene.readRuntime, textureManager);
  return { backgroundSystem, textureManager, veinsSystem, displaySystem };
};
