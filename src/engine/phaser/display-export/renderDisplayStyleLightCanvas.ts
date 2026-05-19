import type { EntityStyle } from "../../../data/schemas/assets/styles";
import {
    DISPLAY_IMAGE_CANVAS_CENTER,
    DISPLAY_IMAGE_CANVAS_SIZE,
    RESOLVED_DISPLAY_ICON_RADIUS,
} from "./displayImageRenderConstants";

export const renderDisplayStyleLightCanvas = (
    ctx: CanvasRenderingContext2D,
    style: EntityStyle | null,
) => {
    if (!style?.light) return;
    const radius = RESOLVED_DISPLAY_ICON_RADIUS * style.light.radiusFactor;
    const gradient = ctx.createRadialGradient(
        DISPLAY_IMAGE_CANVAS_CENTER,
        DISPLAY_IMAGE_CANVAS_CENTER,
        8,
        DISPLAY_IMAGE_CANVAS_CENTER,
        DISPLAY_IMAGE_CANVAS_CENTER,
        radius,
    );
    gradient.addColorStop(0, style.light.color);
    gradient.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = style.light.alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, DISPLAY_IMAGE_CANVAS_SIZE, DISPLAY_IMAGE_CANVAS_SIZE);
    ctx.restore();
};
