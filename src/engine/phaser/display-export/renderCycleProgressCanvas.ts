import type { CycleProgressRopeRequest } from "../display/modules/cycle-progress/cycleProgressRenderModel";
import { DISPLAY_IMAGE_CANVAS_CENTER } from "./displayImageRenderConstants";

export const renderCycleProgressCanvas = (
    ctx: CanvasRenderingContext2D,
    request: CycleProgressRopeRequest | null,
) => {
    if (!request || request.points.length < 2) return;
    ctx.save();
    ctx.translate(DISPLAY_IMAGE_CANVAS_CENTER, DISPLAY_IMAGE_CANVAS_CENTER);
    ctx.strokeStyle = `#${request.tint.toString(16).padStart(6, "0")}`;
    ctx.lineWidth = request.displayWidthPx;
    ctx.globalAlpha = request.alpha;
    ctx.beginPath();
    ctx.moveTo(request.points[0].x, request.points[0].y);
    request.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
    ctx.restore();
};
