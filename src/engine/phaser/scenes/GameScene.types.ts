import Phaser from "phaser";
import type { Runtime } from "../../runtime/Runtime";
import type { RuntimeEntity } from "../../runtime/types";
import type { GameDisplaySystem } from "./GameSceneDisplayInit";
import type { TextureManager } from "../utils/TextureManager";
import type { BiologicalFogBackground } from "../background/BiologicalFogBackground";
import type { VeinsSystem } from "../veins/VeinsSystem";
import type { CameraController } from "../camera/CameraController";
import type { EntityDragController } from "./entityDragController";

export interface GameSceneLike extends Phaser.Scene {
  readonly debugSceneId: string;
  backgroundSystem?: BiologicalFogBackground;
  textureManager?: TextureManager;
  veinsSystem?: VeinsSystem;
  cameraController: CameraController;
  entityDragController: EntityDragController;
  displaySystem: GameDisplaySystem | null;
  readonly readRuntime: () => Runtime | null;
  readonly readSelectedEntityId: () => string | null;
  readonly onSelectEntity: (id: string | null) => void;
  readonly readShouldRenderEntity: (entity: RuntimeEntity) => boolean;
}
