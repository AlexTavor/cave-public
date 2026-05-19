import { createGameRuntime } from "../../../../../engine/runtime/createGameRuntime";
import { deepClone } from "../../../../../utils/objectUtils";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import type { GuidanceDefinition } from "../../../../../data/schemas/guidances";
import { DEFAULT_BLUEPRINT_CONFIG } from "../../../../../data/schemas/blueprintConfig";
import { applyPreviewSystemEntities } from "../../blueprint/visuals/previewSystemEntities";
import { resolveTutorialAttentionPlan } from "../../../../../game/tutorials/resolveTutorialAttentionPlan";

const center = { x: 2000, y: 1800 };

const sanitizePreviewDraft = (draft: ModuleCartridge) => {
    const config = (draft.config ??= { ...DEFAULT_BLUEPRINT_CONFIG });
    config.settings ??= DEFAULT_BLUEPRINT_CONFIG.settings;
    const tutorials = config.settings.tutorials ?? [];
    tutorials.forEach((tutorial) => {
        tutorial.guidances = tutorial.guidances.filter(
            (item) => item.guidanceId.trim().length > 0,
        );
    });
    const world = config.settings.world ?? {};
    world.state ??= {};
    world.cave ??= {
        attributes: { body: 10, mind: 10, social: 10 },
        progression: { xp: 0, level: 1, skillpoints: 0 },
        purge: { isActive: false, nextKillTimer: 0 },
    };
    config.settings.world = world;
};

const spawnPreviewEntities = (
    runtime: ReturnType<typeof createGameRuntime>,
    draft: ModuleCartridge,
) => {
    Object.values(draft.blueprints)
        .filter(
            (blueprint) =>
                blueprint.components.display && blueprint.components.physics,
        )
        .forEach((blueprint, index) =>
            runtime.commands.enqueue({
                type: "SPAWN",
                payload: {
                    blueprintId: blueprint.id,
                    id: blueprint.id,
                    x: center.x + (index % 4) * 180,
                    y: center.y + Math.floor(index / 4) * 180,
                },
            } as any),
        );
    runtime.tick(20);
};

const resolveTargetId = (
    runtime: ReturnType<typeof createGameRuntime>,
    guidance: GuidanceDefinition,
) => {
    if (guidance.presentation !== "node_callout") return null;
    if (guidance.target.kind === "entity_id")
        return runtime.getEntity(guidance.target.entityId)?.id ?? null;
    return (
        runtime.createSnapshot().query({ tag: guidance.target.tag })[0]?.id ??
        null
    );
};

export const createGuidancePreviewRuntime = (
    draft: ModuleCartridge,
    guidance: GuidanceDefinition,
) => {
    if (guidance.presentation === "draft_guidance") return null;
    const cloned = deepClone(draft);
    sanitizePreviewDraft(cloned);
    applyPreviewSystemEntities(cloned, center);
    const runtime = createGameRuntime(cloned, "guidance-preview");
    spawnPreviewEntities(runtime, cloned);
    const targetId = resolveTargetId(runtime, guidance);
    if (guidance.presentation === "node_callout" && !targetId) return null;
    const binding = {
        bindingId: "preview::0",
        guidanceId: guidance.id,
        targetId,
        targetOptionId: null,
        textOverride: null,
    };
    const world = runtime.getEntity("sys_world") as any;
    world.tutorial = {
        _tag: "tutorial",
        active: true,
        tutorialId: "preview",
        selfId: targetId ?? "sys_world",
        primaryTargetId: targetId,
        bindings: [binding],
        attention: resolveTutorialAttentionPlan(
            [binding],
            new Map([[guidance.id, guidance]]),
        ),
    };
    runtime.tick(1);
    return runtime;
};
