import type { ModuleCartridge } from "../../../../../data/schemas/module";
import {
    ensureGlyphAssetById,
    makePlacement,
    readPlacementDraft,
} from "./blueprintVisualsDraft";

const MAX_DELAY_MS = 180;

export const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

export const delayValue = (value: number) =>
    clamp(Math.round(value), 0, MAX_DELAY_MS);

export const setMin = (value: number, ceiling: number, step: number) =>
    Math.min(value, ceiling - step);

export const setMax = (value: number, floor: number, step: number) =>
    Math.max(value, floor + step);

export const withPlacement = (
    glyph: ReturnType<typeof ensureGlyphAssetById>,
    position: number,
) => {
    const existing = readPlacementDraft(glyph, position);
    if (existing) return existing;
    const created = makePlacement(position);
    glyph.placements.push(created);
    return created;
};

export const linkPassportAsset = (
    draft: ModuleCartridge,
    blueprintId: string,
    displayKey: string,
    value: string,
) => {
    const blueprint = draft.blueprints[blueprintId];
    if (!blueprint) return;
    blueprint.components ??= {} as never;
    blueprint.components.display ??= {
        label: blueprint.label || blueprint.id,
        display_key: "unknown",
    } as never;
    blueprint._editor ??= { abilities: {} };
    blueprint._editor.abilities ??= {};
    const passport = (blueprint._editor.abilities.passport ??= {
        label: blueprint.label || blueprint.id,
        icon: blueprint.components.display?.display_key ?? "unknown",
        nervousVein: false,
        permanent: false,
    });
    passport.icon = displayKey;
    if (value) blueprint.components.display.display_key = displayKey;
};
