import { resolveDisplaySource } from "../../../lib/displays/resolveDisplaySource";
import { readDisplayPaletteColors } from "../../../lib/displays/displayKeyKinds";
import { resolveDisplaySpec } from "../display/resolve-display/resolveDisplaySpec";
import { BODY_AVATAR_DISPLAY_KEY } from "../display/avatar/AvatarDisplayConstants";
import type { DisplayImageRequest } from "./DisplayImageExportTypes";
import {
    buildResolvedDisplay,
    readDefaultLineThickness as readDisplayLineThickness,
} from "./displayImageRequestSupport";

type ModuleLike = {
    assets?: {
        displays?: Record<string, any>;
        glyphs?: Record<string, any>;
        settings?: Record<string, unknown>;
        styles?: Record<string, any>;
    };
    blueprints?: Record<string, any>;
};

const getGlyphs = (moduleData: ModuleLike) => moduleData.assets?.glyphs ?? {};

const buildRequestFromModule = (
    displayKey: string,
    moduleData: ModuleLike,
): DisplayImageRequest | null => {
    const displays = moduleData.assets?.displays ?? {};
    const paletteColors = readDisplayPaletteColors(moduleData.assets?.settings);
    const defaultLineThickness = readDisplayLineThickness(
        moduleData,
        displayKey,
    );
    const source = resolveDisplaySource({
        displayKey,
        displays,
        blueprints: moduleData.blueprints ?? {},
    });
    if (source.kind === "display" || source.kind === "unknown") {
        return buildResolvedDisplay(
            displayKey,
            source.asset,
            moduleData.assets?.styles ?? {},
            getGlyphs(moduleData),
            paletteColors,
            defaultLineThickness,
        );
    }
    if (source.kind === "builtin") {
        return {
            kind: "resolved_display",
            displayKey: source.key,
            glyphKey: source.key,
            style: null,
            glyphs: getGlyphs(moduleData),
            paletteColors,
            defaultLineThickness,
            renderSeed: "display-static",
        };
    }
    if (source.kind !== "blueprint") return null;
    const blueprintDisplayKey =
        moduleData.blueprints?.[source.blueprintId]?.components?.display
            ?.display_key;
    if (typeof blueprintDisplayKey === "string") {
        const authored = resolveDisplaySource({
            displayKey: blueprintDisplayKey,
            displays,
            blueprints: moduleData.blueprints ?? {},
        });
        if (authored.kind === "display" || authored.kind === "unknown") {
            return buildResolvedDisplay(
                blueprintDisplayKey,
                authored.asset,
                moduleData.assets?.styles ?? {},
                getGlyphs(moduleData),
                paletteColors,
                readDisplayLineThickness(moduleData, blueprintDisplayKey),
            );
        }
    }
    const spec = resolveDisplaySpec({
        entity: { id: source.blueprintId, tags: [], state: {} } as never,
        blueprint: moduleData.blueprints?.[source.blueprintId],
        physics: null,
        styles: moduleData.assets?.styles ?? {},
        displays,
        blueprints: moduleData.blueprints ?? {},
    });
    if (!spec || spec.display_key === BODY_AVATAR_DISPLAY_KEY) return null;
    return {
        kind: "resolved_display",
        displayKey: spec.display_key,
        glyphKey: spec.glyph_key ?? spec.display_key,
        style: spec.style ?? null,
        glyphs: getGlyphs(moduleData),
        paletteColors,
        defaultLineThickness: readDisplayLineThickness(
            moduleData,
            spec.display_key,
        ),
        renderSeed: "display-static",
    };
};

export const buildDisplayImageRequest = (params: {
    displayKey: string;
    sources: Array<ModuleLike | null | undefined>;
}): DisplayImageRequest | null => {
    for (const source of params.sources) {
        if (!source) continue;
        try {
            const request = buildRequestFromModule(params.displayKey, source);
            if (request) return request;
        } catch {
            continue;
        }
    }
    return null;
};
