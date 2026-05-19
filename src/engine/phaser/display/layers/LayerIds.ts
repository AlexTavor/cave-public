export enum LayerId {
    Veins = "Veins",
    Background = "Background",
    Entities = "Entities",
    Overlays = "Overlays",
    EffectsAnchored = "EffectsAnchored",
    EffectsGlobal = "EffectsGlobal",
}

export const LAYER_DEPTHS: Record<LayerId, number> = {
    [LayerId.Veins]: 0,
    [LayerId.Background]: 5,
    [LayerId.Entities]: 15,
    [LayerId.Overlays]: 25,
    [LayerId.EffectsAnchored]: 35,
    [LayerId.EffectsGlobal]: 45,
};
