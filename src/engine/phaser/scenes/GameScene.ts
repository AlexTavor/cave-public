import Phaser from "phaser";
import { BiologicalFogBackground } from "../background/BiologicalFogBackground";
import type { Runtime } from "../../runtime/Runtime";
import type { RuntimeEntity } from "../../runtime/types";
import type { SerializedCameraState } from "../../runtime/persistence/types";
import { TextureManager } from "../utils/TextureManager";
import { VeinsSystem } from "../veins/VeinsSystem";
import { CameraController } from "../camera/CameraController";
import { EntityDragController } from "./entityDragController";
import type { ResolveDraggedBodyDropTarget } from "./entityDragController.assignment";
import type { GameDisplaySystem } from "./GameSceneDisplayInit";
import { publishDebugSnapshotIfNeeded } from "./GameScene.debug";
import { destroyGameSceneResources } from "./GameScene.cleanup";
import { initializeGameScene } from "./GameScene.create";
import { attachRuntimeIfNeeded } from "./GameScene.runtime";
import { registerGameSceneShutdown } from "./GameScene.shutdown";
import type { RuntimeVisualEvent } from "../../runtime/runtimeVisualEvents";

export interface GameSceneParams {
    getRuntime: () => Runtime | null;
    getSelectedEntityId?: () => string | null;
    selectEntity: (id: string | null) => void;
    getCameraState: () => SerializedCameraState | null;
    setCameraState: (state: SerializedCameraState) => void;
    consumePendingCameraRestore: () => SerializedCameraState | null;
    consumeRuntimeVisualEffects?: () => RuntimeVisualEvent[];
    shouldRenderEntity?: (entity: RuntimeEntity) => boolean;
    resolveDropTarget: ResolveDraggedBodyDropTarget;
}
export class GameScene extends Phaser.Scene {
    private static nextDebugSceneId = 1;
    private readonly getRuntime: () => Runtime | null;
    private readonly getSelectedEntityId: () => string | null;
    private readonly selectEntity: (id: string | null) => void;
    private readonly consumeRuntimeVisualEffects: () => RuntimeVisualEvent[];
    private readonly shouldRenderEntity?: (entity: RuntimeEntity) => boolean;
    public backgroundSystem?: BiologicalFogBackground;
    public textureManager?: TextureManager;
    public veinsSystem?: VeinsSystem;
    public readonly cameraController: CameraController;
    public readonly entityDragController: EntityDragController;
    public readonly debugSceneId: string;
    private attachedRuntime: Runtime | null = null;
    public displaySystem: GameDisplaySystem | null = null;
    private lastDebugPublishMs = 0;
    constructor(params: GameSceneParams) {
        super("GameScene");
        this.debugSceneId = `GameScene-${GameScene.nextDebugSceneId++}`;
        this.getRuntime = params.getRuntime;
        this.getSelectedEntityId = params.getSelectedEntityId ?? (() => null);
        this.selectEntity = params.selectEntity;
        this.consumeRuntimeVisualEffects =
            params.consumeRuntimeVisualEffects ?? (() => []);
        this.shouldRenderEntity = params.shouldRenderEntity;
        this.cameraController = new CameraController(this, {
            selectEntity: params.selectEntity,
            getCameraState: params.getCameraState,
            setCameraState: params.setCameraState,
            consumePendingCameraRestore: params.consumePendingCameraRestore,
        });
        this.entityDragController = new EntityDragController(
            this,
            this.getRuntime,
            params.selectEntity,
            params.resolveDropTarget,
        );
    }

    public readonly readRuntime = () => this.getRuntime();
    public readonly readSelectedEntityId = () => this.getSelectedEntityId();
    public readonly onSelectEntity = (id: string | null) =>
        this.selectEntity(id);
    public readonly readShouldRenderEntity = (entity: RuntimeEntity) =>
        this.shouldRenderEntity?.(entity) ?? true;

    public create(): void {
        const scene = initializeGameScene(this);
        this.backgroundSystem = scene.backgroundSystem;
        this.textureManager = scene.textureManager;
        this.veinsSystem = scene.veinsSystem;
        this.displaySystem = scene.displaySystem;
        this.cameraController.bindInput();
        this.entityDragController.bind();
        this.tryAttachRuntime();
        registerGameSceneShutdown(this, () => destroyGameSceneResources(this));
    }

    public update(_time: number, delta: number): void {
        this.tryAttachRuntime();
        this.cameraController.update();
        const runtime = this.getRuntime();
        if (!runtime) return;
        this.veinsSystem?.update(runtime);
        const pulse01 = this.veinsSystem
            ?.getPulseEngine()
            .getSupplyPulse(runtime.getAccumulatedTime());
        if (pulse01 != null) this.backgroundSystem?.update(runtime, pulse01);
        this.displaySystem?.runtimeVisualEffects.consume(
            this.consumeRuntimeVisualEffects(),
            runtime,
            _time,
            this.getSelectedEntityId(),
        );
        this.displaySystem?.displayManager.tick(
            runtime.getAccumulatedTime(),
            delta * runtime.getTimeScale(),
        );
        this.lastDebugPublishMs = publishDebugSnapshotIfNeeded(
            this,
            runtime,
            this.lastDebugPublishMs,
        );
    }

    private tryAttachRuntime(): void {
        this.attachedRuntime = attachRuntimeIfNeeded(
            this.attachedRuntime,
            this.getRuntime(),
            this.cameraController,
        );
    }
}

