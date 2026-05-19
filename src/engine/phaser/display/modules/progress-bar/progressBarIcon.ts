import type Phaser from "phaser";
import type { GlyphRegistry } from "../../glyph/GlyphRegistry";
import { resolveDisplaySource } from "../../../../../lib/displays/resolveDisplaySource";
import { resolveGlyphPlacementRenderModel } from "../resolveGlyphPlacementRenderModel";
import {
    readDisplayAsset,
    readDisplayAssetGlyphKey,
} from "../../resolve-display/resolveDisplaySpec.helpers";
import type { DisplayTickContext } from "../../types";

const DEG_TO_RAD = Math.PI / 180;

const readCartridge = (scene: DisplayTickContext["scene"]) => {
    const runtime = (
        scene as { readRuntime?: () => unknown }
    ).readRuntime?.() as { getCartridge?: () => any } | undefined;
    return runtime?.getCartridge?.();
};

const resolveGlyphKey = (ctx: DisplayTickContext, resourceId: string) => {
    const cartridge = readCartridge(ctx.scene);
    if (!cartridge) return resourceId;
    const source = resolveDisplaySource({
        displayKey: resourceId,
        displays: cartridge.assets?.displays ?? {},
        blueprints: cartridge.blueprints ?? {},
    });
    return (
        readDisplayAssetGlyphKey(readDisplayAsset(source), source.key) ??
        source.key
    );
};

export const tickProgressBarIcon = (input: {
    ctx: DisplayTickContext;
    icons: Phaser.GameObjects.Image[];
    glyphRegistry: GlyphRegistry;
    resourceId: string;
    radius: number;
    x: number;
    y: number;
}) => {
    const glyph = input.glyphRegistry.get(
        resolveGlyphKey(input.ctx, input.resourceId),
    );
    const instructions = resolveGlyphPlacementRenderModel({
        glyph,
        radius: input.radius,
        paletteColors: input.ctx.pulseEngine.getAllNodeColors?.(),
        defaultLineThickness:
            input.glyphRegistry.getDefaultLineThickness?.() ?? 10,
        readPulseValue: () => 0,
    });
    input.icons.forEach((icon, index) => {
        const instruction = instructions.find(
            (item) => item.slotIndex === index,
        );
        if (!instruction) return icon.setVisible(false);
        icon.setTexture(
            input.ctx.textureManager.getGlyphTexture({
                shape: instruction.shape,
                color: instruction.color,
                thickness: instruction.thickness,
            }),
        );
        icon.clearTint();
        icon.setPosition(input.x + instruction.xPx, input.y + instruction.yPx);
        icon.setScale(instruction.imageScale);
        icon.setRotation(instruction.rotationDeg * DEG_TO_RAD);
        icon.setVisible(true);
    });
};
