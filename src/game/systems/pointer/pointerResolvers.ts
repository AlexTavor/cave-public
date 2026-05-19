export const resolvePickupRadius = (holdMs: number): number => {
    const t = Math.max(0, holdMs) / 1000;
    return Math.min(220, 90 + t * t * 160);
};

export const resolvePickupCadenceMs = (holdMs: number): number =>
    Math.max(60, 260 - Math.max(0, holdMs) * 0.28);

export const resolveEligiblePickupIds = (input: {
    bodies: Array<{ id: string; x: number; y: number }>;
    pointerX: number;
    pointerY: number;
    radius: number;
}) =>
    input.bodies
        .filter(
            (body) =>
                Math.hypot(body.x - input.pointerX, body.y - input.pointerY) <=
                input.radius,
        )
        .sort((left, right) => {
            const leftDistance = Math.hypot(
                left.x - input.pointerX,
                left.y - input.pointerY,
            );
            const rightDistance = Math.hypot(
                right.x - input.pointerX,
                right.y - input.pointerY,
            );
            return (
                leftDistance - rightDistance || left.id.localeCompare(right.id)
            );
        })
        .map((body) => body.id);

export const resolveNearestTarget = (input: {
    targets: Array<{
        id: string;
        x: number;
        y: number;
        radius: number;
        kind: string;
    }>;
    pointerX: number;
    pointerY: number;
    radius: number;
}) =>
    input.targets
        .filter(
            (target) =>
                Math.hypot(
                    target.x - input.pointerX,
                    target.y - input.pointerY,
                ) <=
                input.radius + target.radius,
        )
        .sort((left, right) => {
            const leftDistance = Math.hypot(
                left.x - input.pointerX,
                left.y - input.pointerY,
            );
            const rightDistance = Math.hypot(
                right.x - input.pointerX,
                right.y - input.pointerY,
            );
            return (
                leftDistance - rightDistance || left.id.localeCompare(right.id)
            );
        })[0] ?? null;
