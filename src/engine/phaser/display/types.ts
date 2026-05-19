import type Phaser from "phaser";
import type { LayerRegistry } from "./layers/LayerRegistry";
import type { DisplayPoolRegistry } from "./pooling/DisplayPoolRegistry";
import type { TextureManager } from "../utils/TextureManager";
import type { PulseEngine } from "../veins/PulseEngine";
import type { RuntimeEntity } from "../../runtime/types";
import type { RuntimeVisualEffectsManager } from "../effects/RuntimeVisualEffectsManager";
import type { DisplayStyle } from "../../../data/schemas/assets/styles";
import type { ResourceProgressBar } from "../../../lib/displays/resourceProgressBars";
import type { NodeOverlayDisplayBounds } from "./node-overlay/nodeOverlayDisplayBounds";

export interface DisplaySpec {
    entityId: string;
    display_key: string;
    display_asset_key?: string | null;
    displayBars?: ResourceProgressBar[];
    glyph_key?: string | null;
    label: string;
    styleId: string | null;
    style?: DisplayStyle | null;
    hasPhysics: boolean;
    x: number;
    y: number;
    radius: number;
}

export interface ResolvedDisplayStaticSpec {
    entityId: string;
    display: unknown;
    display_key: string;
    display_asset_key?: string | null;
    displayBars?: ResourceProgressBar[];
    glyph_key?: string | null;
    label: string;
    styleId: string | null;
    style?: DisplayStyle | null;
}

export interface DisplayStructuralRecord {
    entityId: string;
    entity: RuntimeEntity;
    staticSpec: ResolvedDisplayStaticSpec;
}

export interface DisplayStructureSyncState {
    runtime: object | null;
    worldRevision: number;
    entityListRevision: number;
    blueprintRevision: number;
    mutationRevision: number;
}

export interface DisplayScratch {
    root: Phaser.GameObjects.Container;
    backgroundAnchor: Phaser.GameObjects.Container;
    effectsAnchor: Phaser.GameObjects.Container;
    overlayAnchor: Phaser.GameObjects.Container;
    backgroundImage: Phaser.GameObjects.Image | null;
    mainImage: Phaser.GameObjects.Image | null;
    particlesManager: Phaser.GameObjects.Particles.ParticleEmitter | null;
    cycleProgressRope: Phaser.GameObjects.Rope | null;
    caveFillGraphics: Phaser.GameObjects.Graphics | null;
    caveHairGraphics: Phaser.GameObjects.Graphics | null;
    nodeOverlayDisplayBounds: NodeOverlayDisplayBounds | null;
}

export interface DisplayInitContext {
    scene: Phaser.Scene;
    layers: LayerRegistry;
    pools: DisplayPoolRegistry;
    textureManager: TextureManager;
    pulseEngine: PulseEngine;
    runtimeVisualEffects?: RuntimeVisualEffectsManager;
    spec: DisplaySpec;
    scratch: DisplayScratch;
    entity: RuntimeEntity;
    selectedEntityId: string | null;
    selectEntity(id: string | null): void;
}

export interface DisplayTickContext extends DisplayInitContext {
    timeMs: number;
    deltaMs: number;
    pulseValue: number;
}

export interface DisplayDestroyContext {
    scene: Phaser.Scene;
    layers: LayerRegistry;
    pools: DisplayPoolRegistry;
    textureManager: TextureManager;
    pulseEngine: PulseEngine;
    runtimeVisualEffects?: RuntimeVisualEffectsManager;
    spec: DisplaySpec;
    scratch: DisplayScratch;
    entity: RuntimeEntity;
}

