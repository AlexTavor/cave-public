import type { DisplayDefinition } from "./moduleTypes";
import type { GlyphRegistry } from "./glyph/GlyphRegistry";
import { LightModule } from "./modules/light/LightModule";
import { TransformModule } from "./modules/transfer/TransformModule";
import { createGlyphModule } from "./modules/glyph/GlyphModule";
import { InteractionModule } from "./modules/interaction/InteractionModule";
import { SelectionModule } from "./modules/selection/SelectionModule";
import { CycleProgressModule } from "./modules/cycle-progress/CycleProgressModule";

/**
 * Default composition used when no DisplayDefinition is registered.
 * PulseModule and ParticlesModule are NOT in the default stack;
 * they are opt-in via explicit DisplayDefinitions.
 */
export const createDefaultPlaceholderDefinition = (
    glyphRegistry: GlyphRegistry,
): DisplayDefinition => ({
    display_key: "__default_placeholder",
    moduleStack: [
        TransformModule,
        LightModule,
        CycleProgressModule,
        createGlyphModule(glyphRegistry),
        InteractionModule,
        SelectionModule,
    ],
});

