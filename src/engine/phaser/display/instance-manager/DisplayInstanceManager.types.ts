import type Phaser from "phaser";
import type { Runtime } from "../../../runtime/Runtime";
import type { LayerRegistry } from "../layers/LayerRegistry";
import type { DisplayPoolRegistry } from "../pooling/DisplayPoolRegistry";
import type { DisplayRegistry } from "../DisplayRegistry";
import type { TextureManager } from "../../utils/TextureManager";
import type { PulseEngine } from "../../veins/PulseEngine";
import type { PlaceholderVariantRegistry } from "../placeholder/PlaceholderVariantRegistry";
import type { ParticlesConfigRegistry } from "../particles/ParticlesConfigRegistry";
import type { AvatarAppearanceRegistry } from "../avatar/AvatarAppearanceRegistry";
import type { GlyphRegistry } from "../glyph/GlyphRegistry";
import type { RuntimeEntity } from "../../../runtime/types";
import type { RuntimeVisualEffectsManager } from "../../effects/RuntimeVisualEffectsManager";

export interface DisplayInstanceManagerDeps {
    scene: Phaser.Scene;
    layers: LayerRegistry;
    pools: DisplayPoolRegistry;
    displayRegistry: DisplayRegistry;
    textureManager: TextureManager;
    pulseEngine: PulseEngine;
    placeholderVariantRegistry: PlaceholderVariantRegistry;
    particlesConfigRegistry: ParticlesConfigRegistry;
    glyphRegistry: GlyphRegistry;
    avatarRegistry: AvatarAppearanceRegistry;
    runtimeVisualEffects?: RuntimeVisualEffectsManager;
    getRuntime: () => Runtime | null;
    getSelectedEntityId: () => string | null;
    selectEntity: (id: string | null) => void;
    shouldRenderEntity?: (entity: RuntimeEntity) => boolean;
}

