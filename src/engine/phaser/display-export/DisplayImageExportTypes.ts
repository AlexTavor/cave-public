import type { GlyphPreset } from "../../../data/schemas/assets/glyphs";
import type { EntityStyle } from "../../../data/schemas/assets/styles";
import type { AvatarAppearance } from "../display/avatar/AvatarDisplayTypes";
import type { GlyphPaletteColors } from "../display/glyph/glyphPlacementColor";

export interface ResolvedDisplayImageRequest {
    kind: "resolved_display";
    displayKey: string;
    glyphKey: string | null;
    style: EntityStyle | null;
    glyphs: Record<string, GlyphPreset> | null;
    paletteColors?: GlyphPaletteColors;
    defaultLineThickness?: number;
    renderSeed: string;
}

export interface AttributeDisplayImageRequest {
    kind: "attribute_display";
    displayKey: string;
}

export interface BodyAvatarImageRequest {
    kind: "body_avatar";
    subjectSeed: string;
    glyphKey: string | null;
    appearance: AvatarAppearance;
    glyphs: Record<string, GlyphPreset> | null;
    renderSeed: string;
}

export type DisplayImageRequest =
    | ResolvedDisplayImageRequest
    | AttributeDisplayImageRequest
    | BodyAvatarImageRequest;

export type NonAvatarDisplayImageRequest = Exclude<
    DisplayImageRequest,
    BodyAvatarImageRequest
>;

export interface DisplayImageExportService {
    getImageUrl(request: DisplayImageRequest): Promise<string>;
    clear(): void;
}
