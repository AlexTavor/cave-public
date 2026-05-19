export const buildPointerPreviewPath = (input: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    timeMs: number;
}) => {
    const points = [] as Array<{ x: number; y: number }>;
    for (let index = 0; index <= 10; index += 1) {
        const t = index / 10;
        const wave = Math.sin(t * Math.PI * 4 + input.timeMs * 0.008) * 12;
        const baseX = input.fromX + (input.toX - input.fromX) * t;
        const baseY = input.fromY + (input.toY - input.fromY) * t;
        points.push({ x: baseX, y: baseY + wave * (1 - Math.abs(0.5 - t)) });
    }
    return points;
};
