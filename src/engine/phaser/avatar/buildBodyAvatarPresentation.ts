import {
    AVATAR_CANVAS_CENTER,
    AVATAR_CANVAS_SIZE,
    AVATAR_GLOW_CORE_ALPHA,
    AVATAR_GLOW_STAMP_ALPHA,
    AVATAR_GLOW_STAMPS,
} from "../display/avatar/AvatarDisplayConstants";
import {
    AVATAR_EYE_SHAPES,
    AVATAR_FACE_SHAPES,
    AVATAR_HAIR_SHAPES,
} from "../display/avatar/AvatarPartCatalog";
import type {
    AvatarAppearance,
    NormalizedShapePath,
} from "../display/avatar/AvatarDisplayTypes";
import type { BodyAvatarPresentation } from "./bodyAvatarBridge";

const paintPath = (
    ctx: CanvasRenderingContext2D,
    path: NormalizedShapePath,
    dx = 0,
    dy = 0,
    sx = 1,
    sy = 1,
) => {
    ctx.beginPath();
    ctx.moveTo(
        AVATAR_CANVAS_CENTER + dx + path[0].x * sx,
        AVATAR_CANVAS_CENTER + dy + path[0].y * sy,
    );
    path.slice(1).forEach((point) => {
        ctx.lineTo(
            AVATAR_CANVAS_CENTER + dx + point.x * sx,
            AVATAR_CANVAS_CENTER + dy + point.y * sy,
        );
    });
    ctx.closePath();
    ctx.fill();
};

const renderLayer = (draw: (ctx: CanvasRenderingContext2D) => void): string => {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_CANVAS_SIZE;
    canvas.height = AVATAR_CANVAS_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx)
        throw new Error("[BodyAvatarPresentation] Missing canvas 2d context.");
    draw(ctx);
    return canvas.toDataURL();
};

export const buildBodyAvatarPresentation = (
    appearance: AvatarAppearance,
): BodyAvatarPresentation => {
    const face = AVATAR_FACE_SHAPES[appearance.faceShapeIndex].path;
    const hair = AVATAR_HAIR_SHAPES[appearance.hairShapeIndex].path;
    const eye = AVATAR_EYE_SHAPES[appearance.eyeShapeIndex].path;
    const glowSrc = renderLayer((ctx) => {
        ctx.fillStyle = "#ffffff";
        AVATAR_GLOW_STAMPS.forEach(([dx, dy]) => {
            ctx.globalAlpha = AVATAR_GLOW_STAMP_ALPHA;
            paintPath(ctx, face, dx, dy);
            paintPath(ctx, hair, dx, dy);
        });
        ctx.globalAlpha = AVATAR_GLOW_CORE_ALPHA;
        paintPath(ctx, face);
        paintPath(ctx, hair);
    });
    const silhouetteSrc = renderLayer((ctx) => {
        ctx.fillStyle = "#000000";
        paintPath(ctx, face);
        paintPath(ctx, hair);
    });
    const eyesSrc = renderLayer((ctx) => {
        ctx.fillStyle = "#ffffff";
        paintPath(
            ctx,
            eye,
            -appearance.eyeSpacing,
            appearance.eyeOffsetY,
            appearance.eyeScaleX,
            appearance.eyeScaleY,
        );
        paintPath(
            ctx,
            eye,
            appearance.eyeSpacing,
            appearance.eyeOffsetY,
            -appearance.eyeScaleX,
            appearance.eyeScaleY,
        );
    });
    return {
        appearanceKey: appearance.appearanceKey,
        glowSrc,
        silhouetteSrc,
        eyesSrc,
    };
};
