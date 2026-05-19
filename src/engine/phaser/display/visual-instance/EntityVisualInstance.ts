import type Phaser from "phaser";
import type { RuntimeEntity } from "../../../runtime/types";
import type { DisplaySpec, DisplayScratch } from "../types";
import type { DisplayModuleRuntime } from "../moduleTypes";
import type { LayerRegistry } from "../layers/LayerRegistry";
import type { DisplayPoolRegistry } from "../pooling/DisplayPoolRegistry";
import type { DisplayRegistry } from "../DisplayRegistry";
import type { TextureManager } from "../../utils/TextureManager";
import type { PulseEngine } from "../../veins/PulseEngine";
import type { RuntimeVisualEffectsManager } from "../../effects/RuntimeVisualEffectsManager";
import type { NodeOverlayDisplayBounds } from "../node-overlay/nodeOverlayDisplayBounds";
import {
    setScratchAlpha,
    updateScratchInteraction,
} from "./EntityVisualInstanceRuntime";
import {
    createEntityVisualInstanceState,
    createEntityVisualInstanceTick,
    destroyEntityVisualInstanceState,
} from "./EntityVisualInstance.lifecycle";

const TUTORIAL_DEEMPHASIS_ALPHA = 0.35;

export class EntityVisualInstance {
    private readonly runtimes: DisplayModuleRuntime[];
    private readonly scratch: DisplayScratch;
    private alive = true;
    private attentionLightSuppressed = false;
    private tutorialBlocked = false;

    constructor(
        private readonly scene: Phaser.Scene,
        private readonly layers: LayerRegistry,
        private readonly pools: DisplayPoolRegistry,
        private readonly textureManager: TextureManager,
        private readonly pulseEngine: PulseEngine,
        private readonly runtimeVisualEffects: RuntimeVisualEffectsManager,
        spec: DisplaySpec,
        entity: RuntimeEntity,
        displayRegistry: DisplayRegistry,
        selectedEntityId: string | null,
        selectEntity: (id: string | null) => void,
    ) {
        const state = createEntityVisualInstanceState({
            scene,
            layers,
            pools,
            textureManager,
            pulseEngine,
            runtimeVisualEffects,
            spec,
            entity,
            displayRegistry,
            selectedEntityId,
            selectEntity,
        });
        this.scratch = state.scratch;
        this.runtimes = state.runtimes;
    }

    public tick(
        spec: DisplaySpec,
        entity: RuntimeEntity,
        timeMs: number,
        deltaMs: number,
        pulseValue: number,
        selectedEntityId: string | null,
        selectEntity: (id: string | null) => void,
    ): void {
        const ctx = createEntityVisualInstanceTick({
            scene: this.scene,
            layers: this.layers,
            pools: this.pools,
            textureManager: this.textureManager,
            pulseEngine: this.pulseEngine,
            runtimeVisualEffects: this.runtimeVisualEffects,
            spec,
            scratch: this.scratch,
            entity,
            attentionLightSuppressed: this.attentionLightSuppressed,
            timeMs,
            deltaMs,
            pulseValue,
            selectedEntityId,
            selectEntity,
        });
        for (const rt of this.runtimes) {
            rt.tick(ctx);
        }
    }

    public destroy(spec: DisplaySpec, entity: RuntimeEntity): void {
        if (!this.alive) return;
        this.alive = false;
        destroyEntityVisualInstanceState({
            scene: this.scene,
            layers: this.layers,
            pools: this.pools,
            textureManager: this.textureManager,
            pulseEngine: this.pulseEngine,
            runtimeVisualEffects: this.runtimeVisualEffects,
            spec,
            scratch: this.scratch,
            entity,
            runtimes: this.runtimes,
        });
    }

    public readNodeOverlayDisplayBounds(): NodeOverlayDisplayBounds | null {
        return this.scratch.nodeOverlayDisplayBounds;
    }

    public applyTutorialDeemphasis(): void {
        setScratchAlpha(this.scratch, TUTORIAL_DEEMPHASIS_ALPHA);
    }

    public clearTutorialDeemphasis(): void {
        setScratchAlpha(this.scratch, 1);
    }

    public setTutorialInteractionBlocked(blocked: boolean): void {
        if (this.tutorialBlocked === blocked) return;
        this.tutorialBlocked = blocked;
        updateScratchInteraction(this.scratch, blocked);
    }

    public setAttentionLightSuppressed(suppressed: boolean): void {
        this.attentionLightSuppressed = suppressed;
    }
}

