import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
} from "../../../engine/runtime/types";
import {
    appendCommandMetadata,
    RuntimeCommandType,
} from "../../../engine/runtime/types";
import { pseudoRandom } from "../../../utils/pseudoRandom";
import { withWorldSeed } from "../../../utils/worldSeed";
import { isBodyEntity } from "../../assignment/bodyAssignment";
import { enqueueCaveCounterAdjust } from "./caveEventCounters";
import { pickBodyIndex, type PurgeRuntime } from "./purgeResolvers";

const randomTimer = (seed: string, min: number, max: number) =>
    min + pseudoRandom(seed) * (max - min);

const emitCavePurge = (
    commands: CommandBuffer<RuntimeCommand>,
    purge: { isActive?: boolean; nextKillTimer?: number },
) =>
    commands.enqueue({
        type: RuntimeCommandType.UPDATE_CAVE,
        payload: { entityId: "sys_world", purge },
    });

export const handleExpiredPurgeTimer = (
    snapshot: Snapshot,
    commands: CommandBuffer<RuntimeCommand>,
    purge: PurgeRuntime,
    min: number,
    max: number,
    worldSeed: string,
) => {
    const bodies = snapshot.getEntities().filter(isBodyEntity);
    if (bodies.length === 0) {
        emitCavePurge(commands, { isActive: false, nextKillTimer: 0 });
        return;
    }
    const seed = withWorldSeed(worldSeed, `${purge.nextKillTimer}:purge`);
    const idx = pickBodyIndex(bodies.length, pseudoRandom(seed));
    const targetId = bodies[idx]?.id;
    if (targetId) {
        commands.enqueue(
            appendCommandMetadata(
                {
                    type: RuntimeCommandType.KILL,
                    payload: { entityId: targetId },
                },
                { cause: "purge" },
            ),
        );
        enqueueCaveCounterAdjust(commands, "cave_evt_purge_kill");
    }
    emitCavePurge(commands, {
        nextKillTimer: randomTimer(seed + "_timer", min, max),
    });
};
