import type { TransferAssetsCommand } from "../types";
import { RuntimeCommandType } from "../types";
import { mergeImpulseConfig } from "../../../data/schemas/physics";
import type { CommandHandler, CommandHandlerContext } from "./types";
import { debitResources, findEntityById } from "./transferUtils";
import { creditResources, ensureLedgerIncoming } from "./transferResources";
import { calculateTransaction } from "../../balancing/transferLogic";
import { buildPendingTransfer } from "./transferPendingBuilder";

const MIN_TRANSFER_THRESHOLD = 0;

export class TransferHandler implements CommandHandler<TransferAssetsCommand> {
    public readonly type = RuntimeCommandType.TRANSFER_ASSETS;

    public handle(
        command: TransferAssetsCommand,
        context: CommandHandlerContext,
    ): void {
        const { sourceId, targetId, payload } = command.payload;
        const source = findEntityById(context.world.entities, sourceId);
        const target = findEntityById(context.world.entities, targetId);

        if (!source || !target) {
            const missing = source ? "target" : "source";
            context.telemetry.log(
                "errors",
                `Transfer failed: ${missing} missing.`,
            );
            return;
        }

        const result = calculateTransaction({ source, target, payload });
        if (!result.success) {
            if (result.error) context.telemetry.log("errors", result.error);
            return;
        }

        const clampedPayload = result.clampedPayload;
        const total = Object.values(clampedPayload).reduce(
            (sum, a) => sum + a,
            0,
        );

        if (total <= 0) {
            context.telemetry.log(
                "errors",
                `Transfer failed: target '${targetId}' at capacity.`,
            );
            return;
        }
        if (total < MIN_TRANSFER_THRESHOLD) return;

        debitResources(source, clampedPayload);

        if (command.payload.isImmediate === true) {
            creditResources(target, clampedPayload, context.telemetry.log);
            context.telemetry.log(
                "tick",
                `Immediate transfer: '${sourceId}' → '${targetId}'.`,
            );
            return;
        }

        const incoming = ensureLedgerIncoming(target);
        for (const [key, amount] of Object.entries(clampedPayload)) {
            incoming[key] = (incoming[key] ?? 0) + amount;
        }

        const impulseConfig = resolveImpulseConfig(context);
        const pending = buildPendingTransfer({
            source,
            target,
            payload: clampedPayload,
            context,
            impulseConfig,
        });

        context.world.add(pending.pendingEntity);
        context.impulseEngine.addBody(pending.body);
        context.impulseEngine.setTarget(
            pending.pendingEntity.id as string,
            targetId,
        );

        context.telemetry.log(
            "tick",
            `Transfer initiated: '${sourceId}' → '${targetId}'.`,
        );
    }
}

function resolveImpulseConfig(context: CommandHandlerContext) {
    return mergeImpulseConfig(
        (context.cartridge.assets as any)?.settings?.impulse,
    );
}

