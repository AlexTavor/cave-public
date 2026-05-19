import {
    PHYSICS_DEFAULT_RADIUS,
    type PhysicsComponent,
} from "../../../../../data/schemas/physics";
import {
    DEFAULT_GAME_CONFIG,
    GameConfigSchema,
} from "../../../../../data/schemas/game/config";
import type { Blueprint } from "../../../../../data/schemas/blueprint";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import { CompilerService } from "../../../../../engine/compiler/CompilerService";
import { createGameRuntime } from "../../../../../engine/runtime/createGameRuntime";
import { Runtime } from "../../../../../engine/runtime/Runtime";
import { RuntimeCommandType } from "../../../../../engine/runtime/types";
import { deepClone } from "../../../../../utils/objectUtils";
import { resolveStyleId } from "./blueprintVisualsDraft";
import { applyPreviewSystemEntities } from "./previewSystemEntities";

const PREVIEW_COMPONENTS = new Set([
    "display",
    "physics",
    "state",
    "powerSink",
    "assignment",
    "body",
]);

const sanitizeBlueprint = (blueprint: Blueprint): Blueprint => ({
    ...blueprint,
    components: Object.fromEntries(
        Object.entries(blueprint.components ?? {}).filter(([key]) =>
            PREVIEW_COMPONENTS.has(key),
        ),
    ) as Blueprint["components"],
});

const ensurePhysics = (blueprint: Blueprint): void => {
    if (blueprint.components.physics) return;
    const radius =
        blueprint.components.display?.radius?.min ?? PHYSICS_DEFAULT_RADIUS;
    blueprint.components.physics = { x: 0, y: 0, radius } as PhysicsComponent;
};

const applyPreviewFillSeed = (source: Blueprint, draft: ModuleCartridge) => {
    const styleId =
        source.components.display?.style ?? resolveStyleId(draft, source.id);
    const style = styleId ? draft.assets?.styles?.[styleId] : null;
    if (style?.cycleProgress?.family === undefined) return null;
    if (style.cycleProgress.family === "none") return null;
    if (source._editor?.abilities?.cycle) {
        const max = source._editor.abilities.cycle.maxProgress.base || 100;
        return { key: "cycle", value: max, max };
    }
    return null;
};

const readPreviewWorldCenter = (draft: ModuleCartridge) => {
    const raw =
        draft.assets?.settings?.game_config ??
        draft.config?.settings?.game_config ??
        {};
    const parsed = GameConfigSchema.safeParse(raw);
    const world = parsed.success
        ? parsed.data.world
        : DEFAULT_GAME_CONFIG.world;
    return { x: world.width / 2, y: world.height / 2 };
};

export const createBlueprintVisualsPreviewRuntime = (
    draft: ModuleCartridge,
    blueprintId: string,
): Runtime | null => {
    const cloned = deepClone(draft);
    const target = cloned.blueprints[blueprintId];
    if (!target || target.tags.includes("body")) return null;
    const compiled = sanitizeBlueprint(new CompilerService().compile(target));
    if (!compiled.components?.display) return null;
    ensurePhysics(compiled);
    if (!compiled.components?.physics) return null;
    const physics = compiled.components.physics;
    if (!physics) return null;
    const fillSeed = applyPreviewFillSeed(target, cloned);
    const center = readPreviewWorldCenter(cloned);
    applyPreviewSystemEntities(cloned, center);
    physics.x = center.x;
    physics.y = center.y;
    const runtime = createGameRuntime(
        { ...cloned, blueprints: { [blueprintId]: compiled } },
        "phase17-visuals-preview",
    );
    runtime.commands.enqueue({
        type: RuntimeCommandType.SPAWN,
        payload: { blueprintId, id: blueprintId },
    });
    runtime.tick(20);
    if (fillSeed) {
        const state = runtime.getEntity(blueprintId)?.state as
            | Record<string, unknown>
            | undefined;
        if (state) {
            state[fillSeed.key] = { value: fillSeed.value, max: fillSeed.max };
        }
        runtime.tick(1);
    }
    runtime.commands.enqueue({
        type: RuntimeCommandType.POSITION_ENTITY,
        payload: { id: blueprintId, x: center.x, y: center.y },
    });
    runtime.tick(1);
    return runtime;
};
