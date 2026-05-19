import type { RuntimeEntity } from "../../engine/runtime/types";
import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";
import { CaveComponent } from "../../data/schemas/components";

const PENDING_TAG = "pending_transfer";

type TransferData = {
    sourceId: string;
    targetId: string;
    payload: Record<string, number>;
    status: string;
};

const creditPayload = (
    entity: RuntimeEntity,
    payload: Record<string, number>,
): void => {
    const state = ((entity as { state?: Record<string, unknown> }).state ??=
        {});
    for (const [key, amount] of Object.entries(payload)) {
        if (key === "xp" && entity.id === "sys_world") {
            // Special handling for xp to credit into cave progression instead of world state
            handleCaveXp(entity, amount);
            continue;
        }
        const entry = state[key] as { value?: number } | undefined;
        if (entry && typeof entry.value === "number") {
            entry.value += amount;
        } else {
            state[key] = { value: amount, visible: false };
        }
    }
};

export const flushPendingTransfers = (context: CommandHandlerContext): void => {
    const pending = context.world.entities.filter((e) => {
        const tags = (e as { tags?: string[] }).tags ?? [];
        return tags.includes(PENDING_TAG);
    });
    for (const entity of pending) {
        const xfer = (entity as { transfer?: TransferData }).transfer;
        if (!xfer) continue;
        const receiverId =
            xfer.status === "returning" ? xfer.sourceId : xfer.targetId;
        const receiver = context.world.entities.find(
            (e) => e.id === receiverId,
        );
        if (receiver) creditPayload(receiver, xfer.payload);
        context.world.remove(entity);
        if (entity.id) context.impulseEngine.removeBody(entity.id);
    }
};

function handleCaveXp(entity: RuntimeEntity, amount: number) {
    const cave = (entity as Record<string, unknown>).cave as
        | CaveComponent
        | undefined;
    if (cave) {
        const prog = cave.progression ?? {
            xp: 0,
            level: 1,
            skillpoints: 0,
        };
        prog.xp = (prog.xp ?? 0) + amount;
    }
}

