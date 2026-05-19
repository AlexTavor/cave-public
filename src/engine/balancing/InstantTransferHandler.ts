import type {
    CommandHandler,
    CommandHandlerContext,
} from "../runtime/handlers/types";
import type { RuntimeEntity, TransferAssetsCommand } from "../runtime/types";
import { RuntimeCommandType } from "../runtime/types";
import { calculateTransaction } from "./transferLogic";
import { debitResources } from "../runtime/handlers/transferUtils";

const ensureStateRecord = (
    entity: RuntimeEntity,
): Record<string, { value: number; visible?: boolean }> => {
    if (!entity.state || typeof entity.state !== "object") {
        entity.state = {};
    }
    return entity.state as Record<string, { value: number; visible?: boolean }>;
};

const creditResources = (
    entity: RuntimeEntity,
    payload: Record<string, number>,
    log: CommandHandlerContext["telemetry"]["log"],
): void => {
    const state = ensureStateRecord(entity);

    for (const [key, amount] of Object.entries(payload)) {
        if (!Number.isFinite(amount) || amount <= 0) {
            log(
                "errors",
                `Transfer failed: invalid amount '${amount}' for '${key}'.`,
            );
            continue;
        }

        const entry = state[key];
        if (!entry) {
            state[key] = { value: amount, visible: false };
            continue;
        }

        if (typeof entry.value !== "number") {
            log(
                "errors",
                `Transfer failed: '${key}' has non-numeric value on '${entity.id}'.`,
            );
            continue;
        }

        entry.value += amount;
    }
};

export class InstantTransferHandler implements CommandHandler<TransferAssetsCommand> {
    public readonly type = RuntimeCommandType.TRANSFER_ASSETS;

    public handle(
        command: TransferAssetsCommand,
        context: CommandHandlerContext,
    ): void {
        const { sourceId, targetId, payload } = command.payload;
        const source = context.world.entities.find(
            (entity) => entity.id === sourceId,
        );
        const target = context.world.entities.find(
            (entity) => entity.id === targetId,
        );

        const result = calculateTransaction({ source, target, payload });
        if (!result.success) {
            if (result.error) {
                context.telemetry.log("errors", result.error);
            }
            return;
        }

        if (Object.keys(result.clampedPayload).length === 0) return;

        debitResources(source as RuntimeEntity, result.clampedPayload);
        creditResources(
            target as RuntimeEntity,
            result.clampedPayload,
            context.telemetry.log,
        );
    }
}
