import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import type { Blueprint } from "../../../data/schemas/blueprint";

const STORAGE_KEYS = ["allowDeposit", "allowWithdraw", "priority"] as const;
const BAR_RESOURCE_RE = /^state\.([^.]+)(?:\.(?:value|max))?$/;

const isStorageOwnedStateEntry = (
    entry: unknown,
): entry is Record<string, unknown> =>
    !!entry &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    STORAGE_KEYS.some((key) => Object.hasOwn(entry, key));

const cleanResource = (resource: string) => resource.trim();
const readBarResource = (key: unknown) =>
    typeof key === "string" ? (BAR_RESOURCE_RE.exec(key)?.[1] ?? null) : null;
const isCycleCostResource = (draft: Blueprint, resource: string) =>
    Object.hasOwn(
        draft.components?.state ?? {},
        `vals_cycle_cost_total_${resource}`,
    ) ||
    Boolean(
        draft.components?.behavior?.rules?.some(
            (rule) => rule.id === `sys_cycle_cost_consume_${resource}`,
        ),
    );

const getPrefixes = (resource: string) => ({
    state: [
        `vals_storage_${resource}_cap_`,
        `vals_entropy_${resource}_`,
        `vals_entropy_tick_${resource}_`,
        `auto_req_${resource}_timer_`,
        `auto_req_${resource}_need_`,
    ],
    refs: [
        `self.state.vals_storage_${resource}_cap_`,
        `self.state.vals_entropy_${resource}_`,
        `self.state.vals_entropy_tick_${resource}_`,
        `self.state.auto_req_${resource}_timer_`,
        `self.state.auto_req_${resource}_need_`,
    ],
});

export const reconcileStorageCompilerArtifacts = (
    draft: Blueprint,
    configs: StorageAbilityConfig[],
): void => {
    const components = draft.components;
    const state = components?.state;
    const cleanupResources = new Set(
        configs.map((config) => cleanResource(config.resource)).filter(Boolean),
    );

    Object.entries(state ?? {}).forEach(([key, entry]) => {
        if (isStorageOwnedStateEntry(entry)) cleanupResources.add(key);
    });

    cleanupResources.forEach((resource) => {
        if (isCycleCostResource(draft, resource)) return;
        const prefixes = getPrefixes(resource);
        Object.keys(state ?? {}).forEach((key) => {
            if (
                (key === resource && isStorageOwnedStateEntry(state?.[key])) ||
                prefixes.state.some((prefix) => key.startsWith(prefix))
            ) {
                delete state?.[key];
            }
        });

        draft.tags = (draft.tags ?? []).filter(
            (tag) => tag !== `storage:${resource}`,
        );
        if (Array.isArray(components?.display?.bars)) {
            components.display.bars = components.display.bars.filter(
                (bar) => readBarResource(bar.key) !== resource,
            );
        }
        if (Array.isArray(components?.passiveEffects)) {
            components.passiveEffects = components.passiveEffects.filter(
                (effect) => {
                    if (
                        prefixes.refs.some(
                            (prefix) =>
                                typeof effect.target === "string" &&
                                effect.target.startsWith(prefix),
                        )
                    ) {
                        return false;
                    }
                    if (
                        prefixes.refs.some(
                            (prefix) =>
                                typeof effect.source === "string" &&
                                effect.source.startsWith(prefix),
                        )
                    ) {
                        return false;
                    }
                    if (effect.target === `self.state.${resource}.max`)
                        return false;
                    return !(
                        effect.op === "SUB" &&
                        effect.target === `self.state.${resource}.value` &&
                        typeof effect.source === "string" &&
                        effect.source.startsWith(
                            `self.state.vals_entropy_tick_${resource}_`,
                        )
                    );
                },
            );
        }
        if (Array.isArray(components?.behavior?.rules)) {
            components.behavior.rules = components.behavior.rules.filter(
                (rule) =>
                    !rule.id?.startsWith(`sys_auto_req_${resource}_need_`) &&
                    !rule.id?.startsWith(`sys_auto_req_${resource}_xfer_`) &&
                    !rule.id?.startsWith(`sys_auto_req_${resource}_xfer_cap_`),
            );
        }
    });
};
