import Phaser from "phaser";
import { TextureKeys } from "../display/placeholder/TextureKeys";
import type { AvatarAppearance } from "../display/avatar/AvatarDisplayTypes";
import {
    generateAvatarEyesTexture,
    generateAvatarGlowTexture,
    generateAvatarSilhouetteTexture,
} from "../display/avatar/AvatarTextureGen";
import { generatePlaceholderTextures } from "./PlaceholderTextureGen";
import {
    generateShapeTexture,
    type ShapeTextureOptions,
} from "./ShapeTextureGen";
import {
    generateGlyphTexture,
    generateGlyphTextures,
} from "../display/glyph/GlyphTextureGen";
import type { GlyphShape } from "../../../data/schemas/assets/GlyphTypes";
import type { TextureManagerStats } from "../debug/phaserDebugStats";
import { ensureProgressBarStripTexture } from "./ProgressBarTextureGen";
import { ensureSolidStripTexture } from "./SolidStripTextureGen";
import { getTextureManagerStats } from "./textureManagerStats";
import { ensureVeinStripTexture } from "./VeinTextureGen";

export type { ShapeKind, ShapeTextureOptions } from "./ShapeTextureGen";
export { STANDARD_TEXTURE_RADIUS } from "./ShapeTextureGen";

export class TextureManager {
    private readonly scene: Phaser.Scene;
    private readonly scratchGraphics: Phaser.GameObjects.Graphics;
    private initialized = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.scratchGraphics = scene.add.graphics();
        this.scratchGraphics.setVisible(false);
        this.initialize();
    }

    public initialize(): void {
        if (this.initialized) return;
        this.initialized = true;
        generatePlaceholderTextures(this.scene, this.scratchGraphics);
        generateGlyphTextures(this.scene, this.scratchGraphics);
    }

    public get(key: TextureKeys): string {
        return key;
    }

    public getShapeTexture(options: ShapeTextureOptions): string {
        return generateShapeTexture(this.scene, this.scratchGraphics, options);
    }

    public getGlyphTexture(options: {
        shape: GlyphShape;
        color: string;
        thickness: number;
    }): string {
        return generateGlyphTexture(this.scene, this.scratchGraphics, options);
    }

    public getAvatarSilhouetteTexture(appearance: AvatarAppearance): string {
        return generateAvatarSilhouetteTexture(
            this.scene,
            this.scratchGraphics,
            appearance,
        );
    }

    public getVeinStripTexture(): string {
        return ensureVeinStripTexture(this.scene, this.scratchGraphics);
    }

    public getProgressBarStripTexture(): string {
        return ensureProgressBarStripTexture(this.scene, this.scratchGraphics);
    }

    public getSolidStripTexture(): string {
        return ensureSolidStripTexture(this.scene, this.scratchGraphics);
    }

    public getAvatarGlowTexture(appearance: AvatarAppearance): string {
        return generateAvatarGlowTexture(
            this.scene,
            this.scratchGraphics,
            appearance,
        );
    }

    public getAvatarEyesTexture(appearance: AvatarAppearance): string {
        return generateAvatarEyesTexture(
            this.scene,
            this.scratchGraphics,
            appearance,
        );
    }

    public getStats(): TextureManagerStats {
        return getTextureManagerStats(this.scene.textures.getTextureKeys());
    }

    public destroy(): void {
        this.scratchGraphics.destroy();
    }
}

