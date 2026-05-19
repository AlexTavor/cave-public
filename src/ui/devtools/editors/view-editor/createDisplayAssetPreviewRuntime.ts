import {
    DEFAULT_GAME_CONFIG,
    GameConfigSchema,
} from "../../../../data/schemas/game/config";
import type { ModuleCartridge } from "../../../../data/schemas/module";
import { createGameRuntime } from "../../../../engine/runtime/createGameRuntime";
import { Runtime } from "../../../../engine/runtime/Runtime";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import {
    RESOLVED_DISPLAY_ICON_RADIUS,
    RESOLVED_DISPLAY_PREVIEW_ENTITY_ID,
} from "../../../../engine/phaser/display-export/displayImageRenderConstants";
import { deepClone } from "../../../../utils/objectUtils";
import { applyPreviewSystemEntities } from "../blueprint/visuals/previewSystemEntities";

const PREVIEW_DISPLAY_KEY = "__display_preview_asset__";

const clampPreviewProgress = (value: number) =>
    Math.max(0, Math.min(100, value));

const readPreviewCycleState = (
    draft: ModuleCartridge,
    displayKey: string,
    progress: number,
) => {
    const display = draft.assets.displays?.[displayKey];
    const styleId =
        display?.type === "resource"
            ? (display.styleId ?? displayKey)
            : displayKey;
    const family = draft.assets.styles?.[styleId]?.cycleProgress?.family;
    if (!family || family === "none") return {};
    return {
        cycle: { value: clampPreviewProgress(progress), max: 100 },
    };
};

const readPreviewCenter = (draft: ModuleCartridge) => {
    const raw =
        draft.assets.settings.game_config ??
        draft.config?.settings?.game_config ??
        {};
    const parsed = GameConfigSchema.safeParse(raw);
    const world = parsed.success
        ? parsed.data.world
        : DEFAULT_GAME_CONFIG.world;
    return { x: world.width / 2, y: world.height / 2 };
};

export const createDisplayAssetPreviewRuntime = (
    draft: ModuleCartridge,
    displayKey: string,
    cycleProgressPreview = 100,
): Runtime => {
    const cloned = deepClone(draft);
    const center = readPreviewCenter(cloned);
    applyPreviewSystemEntities(cloned, center);
    const previewDisplay = cloned.assets.displays?.[displayKey];
    if (previewDisplay) {
        cloned.assets.displays[PREVIEW_DISPLAY_KEY] = deepClone(previewDisplay);
    }
    cloned.blueprints[RESOLVED_DISPLAY_PREVIEW_ENTITY_ID] = {
        id: RESOLVED_DISPLAY_PREVIEW_ENTITY_ID,
        label: "Preview",
        tags: [],
        components: {
            display: {
                label: displayKey,
                display_key: previewDisplay ? PREVIEW_DISPLAY_KEY : displayKey,
                radius: {
                    min: RESOLVED_DISPLAY_ICON_RADIUS,
                    max: RESOLVED_DISPLAY_ICON_RADIUS,
                },
            },
            physics: {
                x: center.x,
                y: center.y,
                radius: RESOLVED_DISPLAY_ICON_RADIUS,
            },
            powerSink: {
                baseDemand: { body: 0, mind: 0, social: 0 },
                maxDemand: { body: 0, mind: 0, social: 0 },
                status: "nominal",
                drawFraction: { body: 1 },
                allocatedDraw: { body: 1 },
            },
            state: readPreviewCycleState(
                cloned,
                displayKey,
                cycleProgressPreview,
            ),
        },
    } as never;
    const runtime = createGameRuntime(cloned, "display-view-preview");
    runtime.commands.enqueue({
        type: RuntimeCommandType.SPAWN,
        payload: {
            blueprintId: RESOLVED_DISPLAY_PREVIEW_ENTITY_ID,
            id: RESOLVED_DISPLAY_PREVIEW_ENTITY_ID,
        },
    });
    runtime.tick(20);
    return runtime;
};
