import type { ModuleCartridge } from "../../data/schemas/module";
import type { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";
import { Snapshot } from "../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../engine/runtime/types";
import {
    isPoolContributingBody,
    collectPoolExcludedBodyIds,
} from "../systems/poolContributors";
import { pseudoRandom } from "../../utils/pseudoRandom";
import { withWorldSeed } from "../../utils/worldSeed";

const bySeed = (worldSeed: string, left: RuntimeEntity, right: RuntimeEntity) =>
    pseudoRandom(withWorldSeed(worldSeed, String(left.id)))
        .toString()
        .localeCompare(
            pseudoRandom(withWorldSeed(worldSeed, String(right.id))).toString(),
        );

export const resolveBodiesToKill = (input: {
    entities: RuntimeEntity[];
    cartridge: ModuleCartridge;
    impulseEngine: ImpulseEngine;
    quantity: number;
    worldSeed: string;
}): string[] => {
    const snapshot = new Snapshot(
        input.entities,
        input.impulseEngine,
        input.cartridge.blueprints,
    );
    const excluded = collectPoolExcludedBodyIds(snapshot);
    const bodies = snapshot
        .getEntities()
        .filter((entity) => isPoolContributingBody(entity, excluded))
        .sort((left, right) => bySeed(input.worldSeed, left, right));
    return bodies
        .slice(0, Math.max(0, bodies.length - Math.max(0, input.quantity)))
        .map((entity) => String(entity.id));
};
