import type Phaser from "phaser";
import type { RuntimeEntity } from "../../../runtime/types";
import type { DisplayRegistry } from "../DisplayRegistry";
import type { LayerRegistry } from "../layers/LayerRegistry";
import type { DisplayModuleRuntime } from "../moduleTypes";
import type { DisplayPoolRegistry } from "../pooling/DisplayPoolRegistry";
import type { DisplayScratch, DisplaySpec } from "../types";
import type { TextureManager } from "../../utils/TextureManager";
import type { PulseEngine } from "../../veins/PulseEngine";
import type { RuntimeVisualEffectsManager } from "../../effects/RuntimeVisualEffectsManager";
import {
    acquireAnchors,
    releaseAnchors,
    validateScratchSlots,
} from "./EntityVisualInstanceHelpers";
import {
    createDestroyContext,
    createInitContext,
    createTickContext,
} from "./EntityVisualInstanceContexts";
import {
    createDisplayModuleRuntimes,
    destroyDisplayModuleRuntimes,
} from "./EntityVisualInstanceRuntime";

type SharedDeps = {
    scene: Phaser.Scene;
    layers: LayerRegistry;
    pools: DisplayPoolRegistry;
    textureManager: TextureManager;
    pulseEngine: PulseEngine;
    runtimeVisualEffects: RuntimeVisualEffectsManager;
};

export const createEntityVisualInstanceState = (
    deps: SharedDeps & {
        spec: DisplaySpec;
        entity: RuntimeEntity;
        displayRegistry: DisplayRegistry;
        selectedEntityId: string | null;
        selectEntity: (id: string | null) => void;
    },
): { scratch: DisplayScratch; runtimes: DisplayModuleRuntime[] } => {
    const scratch = acquireAnchors(
        deps.scene,
        deps.layers,
        deps.pools,
        deps.spec.display_key,
    );
    const runtimes = createDisplayModuleRuntimes(
        deps.displayRegistry,
        deps.spec,
        createInitContext({ ...deps, scratch }),
    );
    return { scratch, runtimes };
};

export const createEntityVisualInstanceTick = (
    deps: SharedDeps & {
        spec: DisplaySpec;
        scratch: DisplayScratch;
        entity: RuntimeEntity;
        attentionLightSuppressed: boolean;
        timeMs: number;
        deltaMs: number;
        pulseValue: number;
        selectedEntityId: string | null;
        selectEntity: (id: string | null) => void;
    },
) => createTickContext(deps);

export const destroyEntityVisualInstanceState = (
    deps: SharedDeps & {
        spec: DisplaySpec;
        entity: RuntimeEntity;
        scratch: DisplayScratch;
        runtimes: DisplayModuleRuntime[];
    },
): void => {
    destroyDisplayModuleRuntimes(deps.runtimes, createDestroyContext(deps));
    validateScratchSlots(deps.scratch, deps.spec.display_key);
    releaseAnchors(deps.scratch, deps.pools, deps.spec.display_key);
};
