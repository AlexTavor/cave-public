import { nanoid } from "nanoid";
import type { ModuleCartridge } from "../../../../data/schemas/module";
import type { Blueprint } from "../../../../data/schemas/blueprint";
import { Runtime } from "../../../../engine/runtime/Runtime";
import { CommandsManager } from "../../../../engine/runtime/CommandsManager";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import { SpawnHandler } from "../../../../engine/runtime/handlers/SpawnHandler";
import { SUPPRESS_UNIFIED_BLUEPRINT_SPAWNS_METADATA_KEY } from "../../../../engine/runtime/handlers/unifiedBlueprints";
import { PositionHandler } from "../../../../engine/runtime/handlers/PositionHandler";
import { UpdateStateHandler } from "../../../../engine/runtime/handlers/UpdateStateHandler";
import { deepClone } from "../../../../utils/objectUtils";

const DISPLAY_COMPONENT_KEYS = new Set([
    "display",
    "physics",
    "body",
    "state",
    "parent",
]);

const sanitizeBlueprint = (blueprint: Blueprint): Blueprint =>
    ({
        ...blueprint,
        components: Object.fromEntries(
            Object.entries(blueprint.components ?? {}).filter(([key]) =>
                DISPLAY_COMPONENT_KEYS.has(key),
            ),
        ),
    }) as Blueprint;

const resolveParentId = (runtime: Runtime, blueprint: Blueprint) => {
    const parent = blueprint.components?.parent;
    if (!parent) return undefined;
    if ("parentId" in parent) return runtime.getEntity(parent.parentId)?.id;
    if (parent.kind === "entity_id") {
        return runtime.getEntity(parent.entityId)?.id;
    }
    return runtime
        .getEntities()
        .find((entity) => entity.tags?.includes(parent.tag))?.id;
};

const relinkLayoutParents = (
    runtime: Runtime,
    blueprints: Record<string, Blueprint>,
) => {
    runtime.getEntities().forEach((entity) => {
        if (!entity.id || typeof entity.blueprintId !== "string") return;
        const blueprint = blueprints[entity.blueprintId];
        if (!blueprint?.components?.parent) return;
        const parentId = resolveParentId(runtime, blueprint);
        if (!parentId || parentId === entity.id) return;
        entity.parent = { parentId };
    });
};

const createLayoutCommands = () => {
    const commands = new CommandsManager();
    commands.registerHandler(new SpawnHandler());
    commands.registerHandler(new PositionHandler());
    commands.registerHandler(new UpdateStateHandler());
    return commands;
};

type CreateLayoutRuntimeOptions = {
    disablePeerBlueprintSpawns?: boolean;
};

export const createLayoutRuntime = (
    cartridge: ModuleCartridge,
    options: CreateLayoutRuntimeOptions = {},
): Runtime => {
    const clonedCartridge: ModuleCartridge = {
        ...deepClone(cartridge),
        blueprints: Object.fromEntries(
            Object.entries(cartridge.blueprints).map(([id, blueprint]) => [
                id,
                sanitizeBlueprint(blueprint),
            ]),
        ),
    };
    const runtime = new Runtime(
        clonedCartridge,
        nanoid(),
        createLayoutCommands(),
    );

    for (const blueprint of Object.values(clonedCartridge.blueprints)) {
        runtime.commands.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: { blueprintId: blueprint.id, id: blueprint.id },
            metadata: options.disablePeerBlueprintSpawns
                ? {
                      [SUPPRESS_UNIFIED_BLUEPRINT_SPAWNS_METADATA_KEY]: true,
                  }
                : undefined,
        });
    }

    runtime.tick(20);
    relinkLayoutParents(runtime, clonedCartridge.blueprints);
    return runtime;
};
