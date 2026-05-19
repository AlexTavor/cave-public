import type { ModuleCartridge } from "../../../../data/schemas/module";
import type { LeverDefinition } from "../../../../engine/balancing/Scanner";
import { deepClone, getByPath, setByPath } from "../../../../utils/objectUtils";

const toStateKey = (key: string): string =>
    key
        .replace(/^self\.state\./, "")
        .replace(/\.value$/, "")
        .split(".")
        .filter(Boolean)
        .join("_");

const ensureStateEntry = (
    cartridge: ModuleCartridge,
    blueprintId: string,
    stateKey: string,
    value: number,
) => {
    const path = `blueprints.${blueprintId}.components.state.${stateKey}`;
    const existing = getByPath(cartridge, path) as
        | { value?: number; visible?: boolean }
        | undefined;

    setByPath(cartridge, path, {
        ...existing,
        value,
        visible: existing?.visible ?? false,
    });
};

export const patchCartridge = (
    original: ModuleCartridge,
    overrides: Record<string, number>,
    promotions: Record<string, string>,
    levers: LeverDefinition[],
): ModuleCartridge => {
    const patched = deepClone(original);
    const leverIndex = new Map(levers.map((lever) => [lever.id, lever]));

    for (const [id, key] of Object.entries(promotions)) {
        const lever = leverIndex.get(id);
        if (lever?.type !== "behavior" || !lever?.blueprintId) continue;

        const stateKey = key || toStateKey(lever.target ?? "value");
        const override = overrides[id];
        const value = Number.isFinite(override) ? override : lever.value;

        ensureStateEntry(patched, lever.blueprintId, stateKey, value);
        setByPath(patched, lever.path, `self.state.${stateKey}`);
    }

    for (const [id, value] of Object.entries(overrides)) {
        const lever = leverIndex.get(id);
        const promotion = Object.hasOwn(promotions, id)
            ? promotions[id]
            : undefined;

        if (lever?.type === "behavior" && promotion && lever.blueprintId) {
            const stateKey = promotion;
            ensureStateEntry(patched, lever.blueprintId, stateKey, value);
            continue;
        }

        setByPath(patched, lever?.path ?? id, value);
    }

    return patched;
};
