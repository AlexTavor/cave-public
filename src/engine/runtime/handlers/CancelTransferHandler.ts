import type { CancelTransferCommand, RuntimeEntity } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";

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

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

const resolveLedgerIncoming = (
    entity: RuntimeEntity | undefined,
): Record<string, number> | null => {
    if (!entity?.ledger || typeof entity.ledger !== "object") return null;
    const incoming = entity.ledger.incoming;
    if (!incoming || typeof incoming !== "object") return null;
    return incoming;
};

const applyLedgerDelta = (
    incoming: Record<string, number> | null,
    payload: Record<string, number>,
    delta: number,
): void => {
    if (!incoming) return;
    for (const [key, amount] of Object.entries(payload)) {
        const nextValue = (incoming[key] ?? 0) + amount * delta;
        incoming[key] = Math.max(0, nextValue);
    }
};

export class CancelTransferHandler implements CommandHandler<CancelTransferCommand> {
    public readonly type = RuntimeCommandType.CANCEL_TRANSFER;

    public handle(
        command: CancelTransferCommand,
        context: CommandHandlerContext,
    ): void {
        const { targetId } = command.payload;

        const pendingTransfers = context.world.entities.filter((entity) => {
            const transfer = resolveTransferComponent(entity);
            return (
                transfer?.targetId === targetId && transfer.status === "pending"
            );
        });

        if (pendingTransfers.length === 0) {
            context.telemetry.log(
                "errors",
                `Cancel skipped: no pending transfers for '${targetId}'.`,
            );
            return;
        }

        for (const pending of pendingTransfers) {
            const transfer = resolveTransferComponent(pending);
            if (!transfer) continue;

            const oldSourceId = transfer.sourceId;
            const oldTargetId = transfer.targetId;

            const oldTarget = findEntityById(
                context.world.entities,
                oldTargetId,
            );
            const oldSource = findEntityById(
                context.world.entities,
                oldSourceId,
            );

            applyLedgerDelta(
                resolveLedgerIncoming(oldTarget),
                transfer.payload,
                -1,
            );
            applyLedgerDelta(
                resolveLedgerIncoming(oldSource),
                transfer.payload,
                1,
            );

            pending.transfer = {
                sourceId: oldTargetId,
                targetId: oldSourceId,
                payload: transfer.payload,
                status: "returning" as const,
            };

            if (pending.id) {
                context.impulseEngine.setTarget(pending.id, oldSourceId);
            }
        }

        context.telemetry.log(
            "tick",
            `Cancelled pending transfers targeting '${targetId}'.`,
        );
    }
}
