import type Phaser from "phaser";
import type { RuntimeEntity } from "../../../runtime/types";
import type {
    DisplayDestroyContext,
    DisplayInitContext,
    DisplayScratch,
    DisplaySpec,
    DisplayTickContext,
} from "../types";
import type { LayerRegistry } from "../layers/LayerRegistry";
import type { DisplayPoolRegistry } from "../pooling/DisplayPoolRegistry";
import type { TextureManager } from "../../utils/TextureManager";
import type { PulseEngine } from "../../veins/PulseEngine";
import type { RuntimeVisualEffectsManager } from "../../effects/RuntimeVisualEffectsManager";

const resolveTickEntity = (
    entity: RuntimeEntity,
    attentionLightSuppressed: boolean,
) =>
    attentionLightSuppressed
        ? {
              ...entity,
              __attentionLightSuppressed: true,
          }
        : entity;

export const createTickContext = (input: {
    scene: Phaser.Scene;
    layers: LayerRegistry;
    pools: DisplayPoolRegistry;
    textureManager: TextureManager;
    pulseEngine: PulseEngine;
    runtimeVisualEffects: RuntimeVisualEffectsManager;
    spec: DisplaySpec;
    scratch: DisplayScratch;
    entity: RuntimeEntity;
    attentionLightSuppressed: boolean;
    timeMs: number;
    deltaMs: number;
    pulseValue: number;
    selectedEntityId: string | null;
    selectEntity: (id: string | null) => void;
}): DisplayTickContext => ({
    scene: input.scene,
    layers: input.layers,
    pools: input.pools,
    textureManager: input.textureManager,
    pulseEngine: input.pulseEngine,
    runtimeVisualEffects: input.runtimeVisualEffects,
    spec: input.spec,
    scratch: input.scratch,
    entity: resolveTickEntity(input.entity, input.attentionLightSuppressed),
    timeMs: input.timeMs,
    deltaMs: input.deltaMs,
    pulseValue: input.pulseValue,
    selectedEntityId: input.selectedEntityId,
    selectEntity: input.selectEntity,
});

export const createInitContext = (
    input: DisplayInitContext,
): DisplayInitContext => input;

export const createDestroyContext = (
    input: DisplayDestroyContext,
): DisplayDestroyContext => input;
