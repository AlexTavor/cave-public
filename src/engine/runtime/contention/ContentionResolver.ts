import {
    RuntimeCommandType,
    type RuntimeCommand,
    type TransferAssetsCommand,
} from "../types";
import type { Snapshot } from "../Snapshot";
import type { ContentionRule } from "../../../data/schemas/blueprintConfig";

export type RuleResolver = (targetId: string) => ContentionRule[] | undefined;

const getPrimaryResource = (command: TransferAssetsCommand): string => {
    const [resource] = Object.keys(command.payload.payload);
    return resource ?? "";
};

const readPathValue = (input: unknown, path: string): number => {
    if (!input || !path) return 0;
    const parts = path.split(".").filter(Boolean);
    let cursor: unknown = input;
    for (const part of parts) {
        if (!cursor || typeof cursor !== "object") return 0;
        cursor = (cursor as Record<string, unknown>)[part];
    }
    if (typeof cursor === "number") return cursor;
    if (typeof cursor === "boolean") return cursor ? 1 : 0;
    return 0;
};

const sortTransferGroup = (
    transfers: TransferAssetsCommand[],
    snapshot: Snapshot,
    rules: ContentionRule[] | undefined,
): TransferAssetsCommand[] => {
    if (!rules || rules.length === 0) return transfers;
    const resource = getPrimaryResource(transfers[0]);
    const rule = rules.find((entry) => entry.resource === resource);
    if (!rule) return transfers;

    return transfers
        .map((command, index) => {
            const source = snapshot.getEntity(command.payload.sourceId);
            const value = readPathValue(source, rule.sortBy);
            return { command, value, index };
        })
        .sort((a, b) => {
            const delta =
                rule.direction === "ASC"
                    ? a.value - b.value
                    : b.value - a.value;
            if (delta === 0) return a.index - b.index;
            return delta;
        })
        .map((item) => item.command);
};

export const resolveContention = (
    commands: RuntimeCommand[],
    snapshot: Snapshot,
    resolveRules: RuleResolver,
): RuntimeCommand[] => {
    const otherCommands: RuntimeCommand[] = [];
    const transferGroups = new Map<string, TransferAssetsCommand[]>();

    for (const command of commands) {
        if (command.type !== RuntimeCommandType.TRANSFER_ASSETS) {
            otherCommands.push(command);
            continue;
        }

        const resource = getPrimaryResource(command);
        const groupKey = `${command.payload.targetId}:${resource}`;
        const group = transferGroups.get(groupKey);
        if (group) group.push(command);
        else transferGroups.set(groupKey, [command]);
    }

    const sortedTransfers: RuntimeCommand[] = [];
    for (const transfers of transferGroups.values()) {
        const targetId = transfers[0]?.payload.targetId;
        const rules = targetId ? resolveRules(targetId) : undefined;
        sortedTransfers.push(...sortTransferGroup(transfers, snapshot, rules));
    }

    return [...otherCommands, ...sortedTransfers];
};
