import type { RuntimeEntity } from "../../engine/runtime/types";
import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";
import type { ImpulseConfig } from "../../data/schemas/physics";
import { buildPendingTransfer } from "../../engine/runtime/handlers/transferPendingBuilder";
import { ensureLedgerIncoming } from "../../engine/runtime/handlers/transferResources";

const MAX_SPECTACLE_NODE_COUNT = 12;

const resolveNodeCount = (totalAmount: number): number =>
    Math.max(1, Math.min(MAX_SPECTACLE_NODE_COUNT, Math.floor(totalAmount)));

export const spawnYieldSpectacle = (
    context: CommandHandlerContext,
    source: RuntimeEntity,
    target: RuntimeEntity,
    resource: string,
    totalAmount: number,
    config: ImpulseConfig,
): void => {
    if (totalAmount <= 0) return;

    const nodeCount = resolveNodeCount(totalAmount);
    const amountPerNode = totalAmount / nodeCount;

    for (let i = 0; i < nodeCount; i += 1) {
        const pending = buildPendingTransfer({
            source,
            target,
            payload: { [resource]: amountPerNode },
            context,
            impulseConfig: config,
        });

        context.world.add(pending.pendingEntity);
        context.impulseEngine.addBody(pending.body);
        context.impulseEngine.setTarget(
            pending.pendingEntity.id as string,
            target.id ?? "sys_world",
        );
    }

    // Register in-flight amount in the target's ledger so calculateHeadroom
    // accounts for these transfers and the ledger stays consistent.
    const incoming = ensureLedgerIncoming(target);
    incoming[resource] = (incoming[resource] ?? 0) + totalAmount;
};

