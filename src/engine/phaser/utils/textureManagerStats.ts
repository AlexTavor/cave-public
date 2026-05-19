import type { TextureManagerStats } from "../debug/phaserDebugStats";
import { TextureKeys } from "../display/placeholder/TextureKeys";

export const getTextureManagerStats = (
    textureKeys: string[],
): TextureManagerStats => {
    const glyphTextureCount = textureKeys.filter((key) =>
        key.startsWith("glyphtex:"),
    ).length;
    const shapeTextureKeys = textureKeys.filter((key) =>
        key.startsWith("shape:"),
    );
    const avatarTextureCount = textureKeys.filter((key) =>
        key.startsWith("avatar:"),
    ).length;
    return {
        totalTextureCount: textureKeys.length,
        managedTextureCount:
            Object.values(TextureKeys).length +
            glyphTextureCount +
            shapeTextureKeys.length +
            avatarTextureCount,
        placeholderTextureCount: Object.values(TextureKeys).length,
        glyphTextureCount,
        shapeTextureCount: shapeTextureKeys.length,
        shapeTextureKeys,
    };
};
