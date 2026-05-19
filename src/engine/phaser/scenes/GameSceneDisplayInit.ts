import type Phaser from "phaser";
import type { Runtime } from "../../runtime/Runtime";
import type { RuntimeEntity } from "../../runtime/types";
import type { TextureManager } from "../utils/TextureManager";
import type { VeinsSystem } from "../veins/VeinsSystem";
import { LayerRegistry } from "../display/layers/LayerRegistry";
import { DisplayPoolRegistry } from "../display/pooling/DisplayPoolRegistry";
import { DisplayRegistry } from "../display/DisplayRegistry";
import { PlaceholderVariantRegistry } from "../display/placeholder/PlaceholderVariantRegistry";
import { ParticlesConfigRegistry } from "../display/particles/ParticlesConfigRegistry";
import { DisplayInstanceManager } from "../display/instance-manager/DisplayInstanceManager";
import { createDefaultPlaceholderDefinition } from "../display/DefaultPlaceholderDisplayDefinition";
import { createDisplayDefinitions } from "../display/DisplayDefinitionCatalog";
import { AvatarAppearanceRegistry } from "../display/avatar/AvatarAppearanceRegistry";
import { GlyphRegistry } from "../display/glyph/GlyphRegistry";
import { RuntimeVisualEffectsManager } from "../effects/RuntimeVisualEffectsManager";

export interface GameDisplaySystem {
    layers: LayerRegistry;
    pools: DisplayPoolRegistry;
    displayRegistry: DisplayRegistry;
    placeholderVariants: PlaceholderVariantRegistry;
    particlesConfig: ParticlesConfigRegistry;
    glyphRegistry: GlyphRegistry;
    avatarRegistry: AvatarAppearanceRegistry;
    runtimeVisualEffects: RuntimeVisualEffectsManager;
    displayManager: DisplayInstanceManager;
}

export const createGameDisplaySystem = (
    scene: Phaser.Scene,
    textureManager: TextureManager,
    veinsSystem: VeinsSystem,
    getRuntime: () => Runtime | null,
    getSelectedEntityId: () => string | null,
    selectEntity: (id: string | null) => void,
    shouldRenderEntity?: (entity: RuntimeEntity) => boolean,
): GameDisplaySystem => {
    const layers = new LayerRegistry(scene);
    const pools = new DisplayPoolRegistry();
    const placeholderVariants = new PlaceholderVariantRegistry();
    const glyphRegistry = new GlyphRegistry();
    const avatarRegistry = new AvatarAppearanceRegistry();
    const fallbackDef = createDefaultPlaceholderDefinition(glyphRegistry);
    const displayRegistry = new DisplayRegistry(fallbackDef);
    const particlesConfig = new ParticlesConfigRegistry();
    const pulseEngine = veinsSystem.getPulseEngine();
    const runtimeVisualEffects = new RuntimeVisualEffectsManager(
        scene,
        layers,
        pools,
        textureManager,
    );

    for (const def of createDisplayDefinitions(glyphRegistry, avatarRegistry)) {
        displayRegistry.register(def);
    }

    const displayManager = new DisplayInstanceManager({
        scene,
        layers,
        pools,
        displayRegistry,
        textureManager,
        pulseEngine,
        placeholderVariantRegistry: placeholderVariants,
        particlesConfigRegistry: particlesConfig,
        glyphRegistry,
        avatarRegistry,
        runtimeVisualEffects,
        getRuntime,
        getSelectedEntityId,
        selectEntity,
        shouldRenderEntity,
    });

    return {
        layers,
        pools,
        displayRegistry,
        placeholderVariants,
        particlesConfig,
        glyphRegistry,
        avatarRegistry,
        runtimeVisualEffects,
        displayManager,
    };
};

export const destroyGameDisplaySystem = (
    system: GameDisplaySystem | null,
): void => {
    if (!system) return;
    system.displayManager.destroyAll();
    system.runtimeVisualEffects.destroy();
    system.pools.destroyAll();
    system.layers.destroy();
};

