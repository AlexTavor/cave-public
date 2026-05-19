import type { Blueprint } from "../../../data/schemas/blueprint";
import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import { compileScalableValue } from "../utils/scalableCompiler";
import { appendCompiledResourceProgressBar } from "./resourceProgressBarCompiler";
import { compileStorageAutoRequest } from "./storageAutoRequestCompiler";
import { compileStorageEntropy } from "./storageEntropyCompiler";

const clampInitialValue = (initialValue: number, maxValue: number) =>
    Math.min(Math.max(initialValue, 0), Math.max(maxValue, 0));

export const storageCompiler = (
    draft: Blueprint,
    config: StorageAbilityConfig,
    index: number,
    isPrimary: boolean,
): void => {
    const resource = config.resource?.trim();
    if (!resource) {
        console.warn(`Storage ability missing resource on '${draft.id}'.`);
        return;
    }

    draft.components ??= {} as Blueprint["components"];
    const components = draft.components;
    components.state ??= {};
    const initialValue = clampInitialValue(
        config.initialValue ?? 0,
        config.capacity.base,
    );

    components.state[resource] ??= {
        value: initialValue,
        max: config.capacity.base,
        visible: true,
    };

    const entry = components.state[resource];
    entry.value = initialValue;
    entry.visible = config.visible !== false;
    entry.allowDeposit = config.allowDeposit;
    entry.allowWithdraw = config.allowWithdraw;
    entry.priority = config.priority;

    if (typeof components.state[resource]?.max !== "number") {
        components.state[resource].max = config.capacity.base;
    }

    compileScalableValue(
        draft,
        config.capacity,
        `self.state.${resource}.max`,
        `storage_${resource}_cap_${index}`,
    );

    if (config.allowWithdraw) {
        draft.tags ??= [];
        const tag = `storage:${resource}`;
        if (!draft.tags.includes(tag)) draft.tags.push(tag);
    }

    if (config.entropy.base !== 0 || config.entropy.perBody !== 0) {
        compileStorageEntropy(draft, config, resource, index);
    }

    if (config.autoRequest) {
        compileStorageAutoRequest(draft, config.autoRequest, resource, index);
    }

    const display = components.display;
    if (!display) return;

    if (isPrimary && display.radius && !display.radius.valueRef) {
        display.radius.valueRef = `self.state.${resource}.value`;
        display.radius.maxRef = `self.state.${resource}.max`;
    }

    if (config.visible !== false) {
        display.bars ??= [];
        appendCompiledResourceProgressBar({
            bars: display.bars,
            resource,
            maxKey: `state.${resource}.max`,
            label: config.displayName?.trim() || resource,
            color: config.barColorHex,
            paletteColorKey: config.barPaletteColorKey,
            position: config.barPosition,
        });
    }
};

