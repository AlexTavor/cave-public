import type {
    BodyAvatarImageRequest,
    DisplayImageRequest,
    ResolvedDisplayImageRequest,
} from "./DisplayImageExportTypes";

const fail = (message: string): never => {
    console.error(message);
    throw new Error(message);
};

const requireValue = (value: string, label: string): string => {
    if (!value.trim()) {
        return fail(`[DisplayImageExport] Empty ${label} is not allowed.`);
    }
    return value;
};

const buildResolvedDisplayCacheKey = (
    request: ResolvedDisplayImageRequest,
): string =>
    JSON.stringify({
        kind: request.kind,
        displayKey: requireValue(request.displayKey, "display key"),
        glyphKey: request.glyphKey ?? "",
        style: request.style,
        glyphs: request.glyphs,
        paletteColors: request.paletteColors,
        defaultLineThickness: request.defaultLineThickness ?? 10,
        renderSeed: request.renderSeed,
    });

export const buildBodyAvatarCacheKey = (
    request: BodyAvatarImageRequest,
): string =>
    JSON.stringify({
        kind: request.kind,
        renderSeed: requireValue(request.renderSeed, "render seed"),
        subjectSeed: requireValue(request.subjectSeed, "subject seed"),
        glyphKey: request.glyphKey ?? "none",
        appearance: request.appearance,
        glyphs: request.glyphs,
    });

export const buildDisplayCacheKey = (request: DisplayImageRequest): string => {
    if (request.kind === "body_avatar") return buildBodyAvatarCacheKey(request);
    if (request.kind === "attribute_display") {
        return `attribute:${requireValue(request.displayKey, "display key")}`;
    }
    return buildResolvedDisplayCacheKey(request);
};
