import {
    DEFAULT_BACKGROUND_CONFIG,
    DEFAULT_GLYPH_VIEW_CONFIG,
    DEFAULT_VEIN_CONFIG,
} from "../../data/schemas/assets";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import type { ModuleCartridge } from "../../data/schemas/module";

export const serializeCaveFragment = (m: ModuleCartridge): unknown => {
    const gc = m.config?.settings?.game_config ?? DEFAULT_GAME_CONFIG;
    return {
        impulse: m.config?.settings?.impulse ?? DEFAULT_IMPULSE_CONFIG,
        game_config: gc,
        conditions: m.config?.settings?.conditions ?? [],
        guidances: m.config?.settings?.guidances ?? [],
        tutorials: m.config?.settings?.tutorials ?? [],
        knowledge: m.config?.settings?.knowledge ?? [],
        body: m.config?.settings?.body,
        carrier: m.config?.settings?.carrier,
        world: m.config?.settings?.world,
        traits: m.config?.traits ?? {},
        habiti: m.config?.habiti ?? {},
        understanding: m.config?.understanding ?? {},
    };
};

export const serializeAssetFragment = (m: ModuleCartridge): unknown => ({
    displays: m.assets?.displays ?? {},
    glyphs: m.assets?.glyphs ?? {},
    styles: m.assets?.styles ?? {},
    settings: {
        background: m.assets?.settings?.background ?? DEFAULT_BACKGROUND_CONFIG,
        glyph_view: m.assets?.settings?.glyph_view ?? DEFAULT_GLYPH_VIEW_CONFIG,
        vein_network: m.assets?.settings?.vein_network ?? DEFAULT_VEIN_CONFIG,
    },
});

export const serializeDraftFragment = (m: ModuleCartridge): unknown => ({
    draftOptions: m.draftOptions ?? {},
    draftPools: m.draftPools ?? {},
});

