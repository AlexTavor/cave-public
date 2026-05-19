import type { ModuleCartridge } from "../../../../../data/schemas/module";
import { DEFAULT_BLUEPRINT_CONFIG } from "../../../../../data/schemas/blueprintConfig";
import { DEFAULT_POINTER_ENTITY } from "../../../../../data/schemas/v2/pointerSystemDefaults";

const makeSystemEntity = (id: string, x: number, y: number) => ({
    id,
    tags: [id],
    state: {},
    physics: {
        mass: 1,
        radius: 0,
        drag: 0.1,
        isStatic: true,
        x,
        y,
    },
});

export const applyPreviewSystemEntities = (
    draft: ModuleCartridge,
    center: { x: number; y: number },
) => {
    const config = (draft.config ??= { ...DEFAULT_BLUEPRINT_CONFIG });
    config.settings ??= DEFAULT_BLUEPRINT_CONFIG.settings;
    const settings = config.settings as typeof config.settings & {
        pointer?: Record<string, unknown>;
    };
    settings.world = makeSystemEntity("sys_world", center.x, center.y);
    settings.pointer = { ...DEFAULT_POINTER_ENTITY };
};
