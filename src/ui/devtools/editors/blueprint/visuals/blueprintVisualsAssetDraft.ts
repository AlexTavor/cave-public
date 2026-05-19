import type { ModuleCartridge } from "../../../../../data/schemas/module";
import { createDefaultDisplayStyle } from "../../../../../data/schemas/assets/defaultDisplayStyle";
import type { EntityStyle } from "../../../../../data/schemas/assets/styles";
import type { GlyphPreset } from "../../../../../data/schemas/assets/glyphs";
import {
    EntityStyleSchema,
    GlyphPresetSchema,
} from "../../../../../data/schemas/assets";
import { CompilerService } from "../../../../../engine/compiler/CompilerService";
import { generateGlyph } from "../../../../../engine/phaser/display/glyph/GlyphGenerator";
import {
    ensureResourceViewAssets,
    readResourceViewGlyphId,
    readResourceViewStyleId,
} from "../../view-editor/viewEditorAssetLinking";

export const readPassportDraft = (
    draft: ModuleCartridge,
    blueprintId: string,
) => draft.blueprints[blueprintId]?._editor?.abilities?.passport;

export const resolveDisplayId = (draft: ModuleCartridge, blueprintId: string) =>
    readPassportDraft(draft, blueprintId)?.icon?.trim() || blueprintId;

export const resolveStyleId = (draft: ModuleCartridge, blueprintId: string) =>
    readResourceViewStyleId(draft, resolveDisplayId(draft, blueprintId));

export const resolveGlyphId = (draft: ModuleCartridge, blueprintId: string) =>
    readResourceViewGlyphId(draft, resolveDisplayId(draft, blueprintId));

export const readStyleDraft = (
    draft: ModuleCartridge,
    blueprintId: string,
): EntityStyle => {
    const parsed = EntityStyleSchema.safeParse(
        draft.assets.styles?.[resolveStyleId(draft, blueprintId)],
    );
    return parsed.success ? parsed.data : createDefaultDisplayStyle();
};

export const readGlyphDraft = (
    draft: ModuleCartridge,
    blueprintId: string,
): GlyphPreset => {
    const key = resolveGlyphId(draft, blueprintId);
    const parsed = GlyphPresetSchema.safeParse(draft.assets.glyphs?.[key]);
    return parsed.success
        ? parsed.data
        : GlyphPresetSchema.parse(generateGlyph(key, 0));
};

const ensurePassportDraft = (draft: ModuleCartridge, blueprintId: string) => {
    const blueprint = draft.blueprints[blueprintId];
    if (!blueprint) return null;
    blueprint._editor ??= { abilities: {} } as never;
    blueprint._editor.abilities ??= {} as never;
    blueprint._editor.abilities.passport ??= {
        label: blueprint.label || blueprint.id,
        icon: blueprint.components.display?.display_key ?? "unknown",
        nervousVein: false,
        permanent: false,
    };
    return blueprint._editor.abilities.passport;
};

export const ensureStyleAsset = (
    draft: ModuleCartridge,
    blueprintId: string,
) => {
    const styleId = resolveStyleId(draft, blueprintId);
    ensureResourceViewAssets(draft, resolveDisplayId(draft, blueprintId));
    const styles = (draft.assets.styles ??= {});
    styles[styleId] ??= readStyleDraft(draft, blueprintId);
    return styles[styleId];
};

export const ensureGlyphAsset = (
    draft: ModuleCartridge,
    blueprintId: string,
) => {
    const glyphId = resolveGlyphId(draft, blueprintId);
    ensurePassportDraft(draft, blueprintId);
    ensureResourceViewAssets(draft, resolveDisplayId(draft, blueprintId));
    draft.assets.glyphs ??= {};
    draft.assets.glyphs[glyphId] ??= readGlyphDraft(draft, blueprintId);
    return draft.assets.glyphs[glyphId];
};

export const getPreviewSupport = (
    draft: ModuleCartridge,
    blueprintId: string,
) => {
    const blueprint = draft.blueprints[blueprintId];
    if (!blueprint) return { supported: false, reason: "Blueprint not found." };
    if (blueprint.tags.includes("body")) {
        return {
            supported: false,
            reason: "Body blueprints keep the existing avatar flow.",
        };
    }
    const compiled = new CompilerService().compile(blueprint);
    if (!compiled.components.display) {
        return {
            supported: false,
            reason: "Preview requires a compiled display component.",
        };
    }
    return { supported: true, reason: null };
};
