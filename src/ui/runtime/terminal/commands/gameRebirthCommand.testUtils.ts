export { PASSPORT_PERMANENT_TAG } from "../../../../data/schemas/abilities/passport";
import {
    createBlueprint,
    createCartridge,
    createEntity,
} from "../../../../engine/test/factories";
import { createGameRuntime } from "../../../../engine/runtime/createGameRuntime";
import { ClearThoughtHandler } from "../../../../game/handlers/ClearThoughtHandler";
import { registerGameCommandHandlers } from "../../../../game/registerGameCommandHandlers";

export const rebirthCave = {
    attributes: { body: 10, mind: 11, social: 12 },
    progression: { xp: 50, level: 3, skillpoints: 2 },
    ownedHabiti: ["human", "ancient"],
};

export const rebirthPhysics = {
    x: 10,
    y: 20,
    mass: 1,
    radius: 5,
    drag: 0.1,
    isStatic: false,
};

export const makeKeeperBlueprint = (
    label: string,
    max: number,
    tags: string[],
) =>
    createBlueprint("keeper", {
        label,
        tags,
        components: {
            physics: rebirthPhysics,
            state: { hp: { value: 0, visible: false, max } },
        },
    });

export const makeRebirthRuntime = (blueprints: Record<string, unknown>) => {
    const runtime = createGameRuntime(
        createCartridge("test", { blueprints: blueprints as any }),
        "seed",
    );
    registerGameCommandHandlers(runtime);
    runtime.registerCommandHandler(new ClearThoughtHandler() as any);
    runtime.addEntity(
        createEntity("sys_world", {
            cave: structuredClone(rebirthCave),
            permanent: { thought_seen: { intro: 2 } },
            thought: { current: "old" },
        }),
    );
    return runtime;
};
