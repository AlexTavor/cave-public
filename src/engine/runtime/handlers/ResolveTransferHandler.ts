import type { ResolveTransferCommand, RuntimeEntity } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

const resolveTransferComponent = (
    entity: RuntimeEntity,
): {
    sourceId: string;
    targetId: string;
    payload: Record<string, number>;
    status: "pending" | "returning";
} | null => {
    if (entity.transfer) {
        return entity.transfer as {
            sourceId: string;
            targetId: string;
            payload: Record<string, number>;
            status: "pending" | "returning";
        };
    }
    return null;
};

const ensureStateRecord = (
    entity: RuntimeEntity,
): Record<
    string,
    { value: number; max?: number; min?: number; visible?: boolean }
> => {
    if (!entity.state || typeof entity.state !== "object") {
        entity.state = {};
    }
    return entity.state as Record<
        string,
        { value: number; max?: number; min?: number; visible?: boolean }
    >;
};

const resolveLedgerIncoming = (
    entity: RuntimeEntity,
): Record<string, number> | null => {
    const ledger = entity.ledger;
    if (!ledger || typeof ledger !== "object") return null;

    const incoming = ledger.incoming;
    if (!incoming || typeof incoming !== "object") return null;

    return incoming;
};

export class ResolveTransferHandler implements CommandHandler<ResolveTransferCommand> {
    public readonly type = RuntimeCommandType.RESOLVE_TRANSFER;

    public handle(
        command: ResolveTransferCommand,
        context: CommandHandlerContext,
    ): void {
        const { entityId } = command.payload;
        const pending = findEntityById(context.world.entities, entityId);

        if (!pending) return;

        const transfer = resolveTransferComponent(pending);
        if (!transfer) {
            context.telemetry.log(
                "errors",
                `Resolve failed: transfer component missing on '${entityId}'.`,
            );
            return;
        }

        const receiverId =
            transfer.status === "returning"
                ? transfer.sourceId
                : transfer.targetId;

        const receiver = findEntityById(context.world.entities, receiverId);

        if (!receiver) {
            context.telemetry.log(
                "errors",
                `Resolve failed: receiver '${receiverId}' not found.`,
            );
            return;
        }

        const state = ensureStateRecord(receiver);
        const incoming = resolveLedgerIncoming(receiver);

        for (const [key, amount] of Object.entries(transfer.payload)) {
            if (!Number.isFinite(amount)) {
                context.telemetry.log(
                    "errors",
                    `Resolve skipped: invalid amount '${amount}' for '${key}'.`,
                );
                continue;
            }

            if (incoming) {
                const nextValue = (incoming[key] ?? 0) - amount;
                incoming[key] = Math.max(0, nextValue);
            }

            const entry = state[key];
            if (!entry) {
                state[key] = {
                    value: amount,
                    visible: false,
                };
                continue;
            }

            if (typeof entry.value !== "number") {
                context.telemetry.log(
                    "errors",
                    `Resolve skipped: '${key}' has non-numeric value on '${receiverId}'.`,
                );
                continue;
            }

            entry.value += amount;
        }

        context.world.remove(pending);
        if (pending.id) {
            context.impulseEngine.removeBody(pending.id);
        }
        context.telemetry.log(
            "tick",
            `Resolved transfer '${entityId}' to '${receiverId}'.`,
        );
    }
}
