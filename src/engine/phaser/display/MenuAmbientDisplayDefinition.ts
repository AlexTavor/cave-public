import type { DisplayDefinition } from "./moduleTypes";
import type { GlyphRegistry } from "./glyph/GlyphRegistry";
import { TransformModule } from "./modules/transfer/TransformModule";
import { createGlyphModule } from "./modules/glyph/GlyphModule";
import { MenuAmbientProximityLightModule } from "./modules/light/MenuAmbientProximityLightModule";
import { createPulseModule } from "./modules/menu/PulseModule";

export const MENU_AMBIENT_DISPLAY_VARIANT_COUNT = 128;

const createMenuAmbientDisplayDefinition = (
    glyphRegistry: GlyphRegistry,
    display_key: string,
): DisplayDefinition => ({
    display_key,
    moduleStack: [
        TransformModule,
        MenuAmbientProximityLightModule,
        createGlyphModule(glyphRegistry),
        createPulseModule({
            base: 0.92,
            effect: "scale",
            strength: 0.08,
            target: "root",
        }),
    ],
});

export const createMenuAmbientDisplayDefinitions = (
    glyphRegistry: GlyphRegistry,
): DisplayDefinition[] =>
    Array.from({ length: MENU_AMBIENT_DISPLAY_VARIANT_COUNT }, (_, index) =>
        createMenuAmbientDisplayDefinition(
            glyphRegistry,
            `menu_ambient_entity_${index}`,
        ),
    );
