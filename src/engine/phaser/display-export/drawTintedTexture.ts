export const drawTintedTexture = (
    ctx: CanvasRenderingContext2D,
    src: CanvasImageSource,
    params: {
        tint: number;
        x: number;
        y: number;
        scale: number;
        rotationDeg?: number;
        alpha?: number;
    },
): void => {
    const offscreen = document.createElement("canvas");
    offscreen.width = (src as { width?: number }).width ?? 128;
    offscreen.height = (src as { height?: number }).height ?? 128;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx)
        throw new Error("[DisplayImageExport] Missing canvas 2d context.");
    offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
    offCtx.drawImage(src, 0, 0);
    offCtx.globalCompositeOperation = "source-in";
    offCtx.fillStyle = `#${params.tint.toString(16).padStart(6, "0")}`;
    offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.save();
    ctx.translate(params.x, params.y);
    ctx.rotate(((params.rotationDeg ?? 0) * Math.PI) / 180);
    ctx.globalAlpha = params.alpha ?? 1;
    const width = offscreen.width * params.scale;
    const height = offscreen.height * params.scale;
    ctx.drawImage(offscreen, -width / 2, -height / 2, width, height);
    ctx.restore();
};
