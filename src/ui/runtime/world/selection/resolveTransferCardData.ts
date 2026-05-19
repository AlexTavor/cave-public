import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { formatCompactNumber } from "../../status/formatters";
import { resolveEntityLabel } from "./selectionUtils";

export type TransferCardData = {
    summary: string;
    typeLabel: string;
    valueLabel: string;
    sourceLabel: string;
    targetLabel: string;
};

const formatType = (value: string) =>
    value === "xp"
        ? "XP"
        : value
              .replaceAll("_", " ")
              .replaceAll(/\b\w/g, (char) => char.toUpperCase());
const formatPayload = (payload: Record<string, number>) =>
    Object.entries(payload)
        .map(
            ([key, amount]) =>
                `${formatCompactNumber(amount)} ${formatType(key)}`,
        )
        .join(", ");
const resolveLabel = (id: string | undefined, runtime: Runtime | null) => {
    if (!id) return "Unknown";
    const target = runtime?.getEntity(id);
    return target ? resolveEntityLabel(target) : id;
};

export const resolveTransferCardData = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): TransferCardData => {
    const transfer = (entity as { transfer?: any }).transfer ?? {};
    const payload = (transfer.payload ?? {}) as Record<string, number>;
    const entries = Object.entries(payload);
    const [primaryType, primaryValue] = entries[0] ?? [
        transfer.visualType ?? "transfer",
        0,
    ];
    const sourceLabel = resolveLabel(transfer.sourceId, runtime);
    const targetLabel = resolveLabel(transfer.targetId, runtime);
    const typeLabel = formatType(transfer.visualType ?? primaryType);
    const valueLabel =
        entries.length > 1 ? formatPayload(payload) : String(primaryValue);
    const payloadLabel = formatPayload(payload) || `0 ${typeLabel}`;
    return {
        summary: `${payloadLabel} from ${sourceLabel} to ${targetLabel}`,
        typeLabel,
        valueLabel,
        sourceLabel,
        targetLabel,
    };
};
