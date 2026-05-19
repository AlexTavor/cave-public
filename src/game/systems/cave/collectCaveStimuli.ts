import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type { CaveMindMemory } from "../../../data/schemas/game/caveMind";
import type { CaveStimuli } from "./caveMindTypes";
import {
    readStateBool,
    readStateNumber,
    readStateString,
} from "./caveMindReadUtils";
import { resolveBodyStatusCounts } from "./bodyStatusCounts";
import { collectCaveCandidate } from "./collectCaveCandidate";

type Totals = {
    explorationCuriosityEntityIds: Set<string>;
    assignedNodeCuriosityEntityIds: Set<string>;
    firstCycleCuriosityEntityIds: Set<string>;
};

export const collectCaveStimuli = (
    snapshot: Snapshot,
    memory: CaveMindMemory,
): CaveStimuli | null => {
    const world = snapshot.getEntity("sys_world") as any;
    if (!world?.cave) return null;
    const caveBody = snapshot.getPhysicsBody("sys_world");
    const selectedEntityId = readStateString(world, "cave_selected_entity_id");
    const dragEntityId = readStateString(world, "cave_drag_entity_id");
    const dragActive = readStateBool(world, "cave_drag_active");
    const totals: Totals = {
        explorationCuriosityEntityIds: new Set(),
        assignedNodeCuriosityEntityIds: new Set(),
        firstCycleCuriosityEntityIds: new Set(),
    };
    const entities = snapshot.getEntities();
    const candidates = entities.flatMap((entity) => {
        const candidate = collectCaveCandidate(
            snapshot,
            entity,
            memory,
            selectedEntityId,
            dragEntityId,
            dragActive,
            totals,
        );
        return candidate ? [candidate] : [];
    });
    const { starvingBodies, coldBodies } = resolveBodyStatusCounts(entities);
    return {
        world: {
            comfort: readStateNumber(world, "comfort"),
            elapsedRealSeconds: Number(
                world.run?.elapsed_real_seconds?.world ?? 0,
            ),
            xp: world.cave.progression?.xp ?? 0,
            level: world.cave.progression?.level ?? 1,
            purgeActive: Boolean(world.cave.purge?.isActive),
            selectedEntityId,
            dragEntityId,
            dragActive,
            caveWorldX: caveBody?.position.x ?? 0,
            caveWorldY: caveBody?.position.y ?? 0,
            starvingBodies,
            coldBodies,
            explorationCuriosityEntityIds: [
                ...totals.explorationCuriosityEntityIds,
            ],
            assignedNodeCuriosityEntityIds: [
                ...totals.assignedNodeCuriosityEntityIds,
            ],
            firstCycleCuriosityEntityIds: [
                ...totals.firstCycleCuriosityEntityIds,
            ],
            eventCounters: {
                purgeBegan: readStateNumber(world, "cave_evt_purge_began"),
                purgeKill: readStateNumber(world, "cave_evt_purge_kill"),
                absorptionComplete: readStateNumber(
                    world,
                    "cave_evt_absorption_complete",
                ),
                butchered: readStateNumber(world, "cave_evt_butchered"),
            },
        },
        candidates,
    };
};
