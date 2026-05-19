const RING_SIZE = 8;
const SPEED = 0.0006;

export const hasReachedCave = (
    pickup: { x: number; y: number },
    cave: { x: number; y: number; radius: number },
) => Math.hypot(pickup.x - cave.x, pickup.y - cave.y) <= cave.radius + 40;

export const resolveCarrierOrbitPosition = (
    cave: { x: number; y: number; radius: number },
    count: number,
    index: number,
    timeMs: number,
) => {
    const ring = Math.floor(index / RING_SIZE);
    const ringStart = ring * RING_SIZE;
    const ringCount = Math.max(1, Math.min(RING_SIZE, count - ringStart));
    const slot = index - ringStart;
    const angle = timeMs * SPEED + slot * ((Math.PI * 2) / ringCount);
    const radius = cave.radius + 34 + ring * 18;
    return {
        x: cave.x + Math.cos(angle) * radius,
        y: cave.y + Math.sin(angle) * radius,
    };
};
