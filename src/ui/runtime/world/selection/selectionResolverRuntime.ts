import type { TraitDefinition } from "../../../../data/schemas/game/traits";
import type { UnderstandingDefinition } from "../../../../data/schemas/game/understanding";
import type { Runtime } from "../../../../engine/runtime/Runtime";

export const readHabitiIndex = (runtime: Runtime | null) => {
    if (!runtime || typeof runtime.getCartridge !== "function") return {};
    return runtime.getCartridge().config?.habiti ?? {};
};

export const readTraitIndex = (
    runtime: Runtime | null,
): Record<string, TraitDefinition> => {
    if (!runtime) return {};
    try {
        const cartridge = runtime.getCartridge();
        const settings = cartridge.config?.settings as
            | Record<string, unknown>
            | undefined;
        return (
            (settings?.traits as Record<string, TraitDefinition> | undefined) ??
            cartridge.config?.traits ??
            {}
        );
    } catch {
        return {};
    }
};

export const readUnderstandingIndex = (
    runtime: Runtime | null,
): Record<string, UnderstandingDefinition> => {
    if (!runtime || typeof runtime.getCartridge !== "function") return {};
    return runtime.getCartridge().config?.understanding ?? {};
};
