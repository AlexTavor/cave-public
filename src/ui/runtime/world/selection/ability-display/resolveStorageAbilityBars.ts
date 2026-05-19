import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { readDisplayPaletteColors } from "../../../../../lib/displays/displayKeyKinds";
import { resolveResourceProgressBarColor } from "../../../../../lib/displays/resourceProgressBarColor";
import {
    isStorageLikeStateEntry,
    readResourceProgressBars,
} from "../../../../../lib/displays/resourceProgressBars";
import type { AbilityBarModel } from "./abilityDisplay.types";
import { resolveEntityDisplay } from "../selectionUtils";
import {
    formatEffectAmount,
    readNumericValue,
    resolveBarValuePath,
    resolveStateResourceKey,
} from "./abilityDisplay.utils";

const resolveDecayRate = (
    state: Record<string, any>,
    resource: string,
): number => {
    const prefix = `vals_entropy_${resource}_`;
    return Object.entries(state).reduce((sum, [key, entry]) => {
        if (!key.startsWith(prefix) || !entry || typeof entry !== "object") {
            return sum;
        }
        const value = (entry as { value?: unknown }).value;
        return typeof value === "number" && Number.isFinite(value)
            ? sum + value
            : sum;
    }, 0);
};

export const resolveStorageAbilityBars = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): AbilityBarModel[] => {
    const bars = readResourceProgressBars(
        resolveEntityDisplay(entity, runtime),
    );
    const state = (entity as { state?: Record<string, any> }).state ?? {};
    const entityId = entity.id ?? "";
    const cartridge = runtime?.getCartridge?.();
    const paletteColors = runtime
        ? readDisplayPaletteColors(cartridge?.assets?.settings)
        : undefined;
    const seen = new Set<string>();

    return bars.flatMap((bar, index) => {
        const key = typeof bar.key === "string" ? bar.key : null;
        if (!key) return [];
        const signature = `${key}:${bar.maxKey ?? bar.max ?? ""}:${bar.label ?? ""}`;
        if (seen.has(signature)) return [];
        seen.add(signature);
        const resource = key ? resolveStateResourceKey(key) : null;
        const entry = resource ? state[resource] : null;
        if (!resource || !entry || typeof entry !== "object") return [];
        if (!isStorageLikeStateEntry(entry)) return [];
        const valuePath = resolveBarValuePath(key);
        const maxPath = typeof bar.maxKey === "string" ? bar.maxKey : undefined;
        const current = readNumericValue(entity, valuePath) ?? 0;
        const max =
            typeof bar.max === "number"
                ? bar.max
                : (readNumericValue(entity, maxPath) ?? Math.max(current, 1));
        const decayRate = resolveDecayRate(state, resource);
        const decayText =
            decayRate > 0 ? `${formatEffectAmount(decayRate)}/s` : undefined;
        return [
            {
                id: `storage:${entityId}:${resource}:${index}`,
                entityId,
                valuePath,
                ...(maxPath ? { maxPath } : { maxValue: max }),
                current,
                max,
                color: resolveResourceProgressBarColor({
                    resourceId: resource,
                    color: bar.color,
                    paletteColorKey: bar.paletteColorKey,
                    paletteColors,
                }),
                iconId: resource,
                title: bar.label?.trim() || resource,
                titleMetaText: decayText,
                valueBinding: {
                    id: `storage:${entityId}:${resource}:${index}:value`,
                    kind: "compact-fraction",
                    entityId,
                    valuePath,
                    ...(maxPath ? { maxPath } : { maxValue: max }),
                },
                tooltipTitle: bar.label?.trim() || resource,
                tooltipLines: [
                    `Current: ${current}`,
                    `Max: ${max}`,
                    ...(decayText ? [`Decay: ${decayText}`] : []),
                    `Deposit: ${entry.allowDeposit === false ? "No" : "Yes"}`,
                    `Withdraw: ${entry.allowWithdraw === false ? "No" : "Yes"}`,
                    `Priority: ${(entry.priority as number) ?? 0}`,
                ],
                height: 6,
            } satisfies AbilityBarModel,
        ];
    });
};
