import Phaser from "phaser";
import { AvatarAppearanceRegistry } from "../display/avatar/AvatarAppearanceRegistry";
import { GlyphRegistry } from "../display/glyph/GlyphRegistry";
import { PlaceholderVariantRegistry } from "../display/placeholder/PlaceholderVariantRegistry";
import { TextureManager } from "../utils/TextureManager";

export class DisplayRenderHostScene extends Phaser.Scene {
    private static nextId = 1;
    public readonly debugSceneId = `DisplayRenderHost-${DisplayRenderHostScene.nextId++}`;
    public textureManager?: TextureManager;
    public readonly glyphRegistry = new GlyphRegistry();
    public readonly avatarRegistry = new AvatarAppearanceRegistry();
    public readonly placeholderVariants = new PlaceholderVariantRegistry();
    private readonly onReady?: () => void;

    constructor(onReady?: () => void) {
        super("DisplayRenderHostScene");
        this.onReady = onReady;
    }

    public create(): void {
        this.textureManager = new TextureManager(this);
        this.onReady?.();
    }

    public destroyHostResources(): void {
        this.glyphRegistry.clear();
        this.avatarRegistry.clear();
        this.textureManager?.destroy();
        this.textureManager = undefined;
    }
}
