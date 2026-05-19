import type { Runtime } from "../../runtime/Runtime";
import type { BodyComponent } from "../../../data/schemas/game/body";

export const DISTRESS_THRESHOLD = 0.4;

type PulseConfig = { threshold: number; interval: number };

const PULSE_RULES: PulseConfig[] = [
    { threshold: 0.1, interval: 220 },
    { threshold: 0.2, interval: 420 },
    { threshold: DISTRESS_THRESHOLD, interval: 700 },
];

export type DistressPosition = { x: number; y: number; radius: number };

export const resolveInterval = (ratio: number): number => {
    for (const rule of PULSE_RULES) {
        if (ratio < rule.threshold) return rule.interval;
    }
    return PULSE_RULES.at(-1)?.interval ?? 700;
};

export const resolveHealthRatio = (body: BodyComponent): number => {
    const maxHealth = typeof body.maxHealth === "number" ? body.maxHealth : 0;
    if (maxHealth <= 0) return 1;
    const health = typeof body.health === "number" ? body.health : maxHealth;
    return Math.max(0, Math.min(1, health / maxHealth));
};

const toPosition = (b: {
    position: { x: number; y: number };
    radius: number;
}): DistressPosition => ({
    x: b.position.x,
    y: b.position.y,
    radius: b.radius,
});

/** Resolve the visual position for a body entity directly from its own body. */
export const resolveBodyPhysicsPosition = (
    runtime: Runtime,
    entityId: string,
): DistressPosition | null => {
    const direct = runtime.getPhysicsBody(entityId);
    if (direct) return toPosition(direct);
    return null;
};

