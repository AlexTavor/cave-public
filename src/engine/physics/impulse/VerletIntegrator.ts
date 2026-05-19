import type { PhysicsBody } from "./types";

const DEFAULT_AXIS_VALUE = 0;
const REFERENCE_FRAME_DURATION = 1 / 60;
const MAX_ACCELERATION = 80000; // pixels per second squared

const sanitize = (value: number): number =>
    Number.isFinite(value) ? value : DEFAULT_AXIS_VALUE;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const stepVerlet = (
    body: PhysicsBody,
    dt: number,
    globalDrag: number,
    timeCorrection: number = 1,
): void => {
    if (body.isStatic) {
        body.acceleration.x = 0;
        body.acceleration.y = 0;
        return;
    }

    const safeDt = Number.isFinite(dt) ? dt : 0;
    if (safeDt <= 0) {
        body.acceleration.x = 0;
        body.acceleration.y = 0;
        return;
    }

    body.acceleration.x = Math.max(
        -MAX_ACCELERATION,
        Math.min(MAX_ACCELERATION, body.acceleration.x),
    );

    body.acceleration.y = Math.max(
        -MAX_ACCELERATION,
        Math.min(MAX_ACCELERATION, body.acceleration.y),
    );

    const px = sanitize(body.position.x);
    const py = sanitize(body.position.y);
    const prevX = sanitize(body.prevPosition.x);
    const prevY = sanitize(body.prevPosition.y);
    const ax = sanitize(body.acceleration.x);
    const ay = sanitize(body.acceleration.y);

    const baseDrag = clamp01(body.drag * globalDrag);
    const timeRatio = safeDt / REFERENCE_FRAME_DURATION;
    const dragFactor = Math.pow(1 - baseDrag, timeRatio);

    let inertialScale: number;
    if (dragFactor > 0.999) {
        inertialScale = 1;
    } else if (dragFactor < 0.001) {
        inertialScale = 0;
    } else {
        inertialScale = (dragFactor - 1) / Math.log(dragFactor);
    }

    const velocityX = (px - prevX) * inertialScale * timeCorrection;
    const velocityY = (py - prevY) * inertialScale * timeCorrection;

    const nextX = px + velocityX + ax * safeDt * safeDt * 0.5;
    const nextY = py + velocityY + ay * safeDt * safeDt * 0.5;

    body.prevPosition.x = px;
    body.prevPosition.y = py;

    body.position.x = sanitize(nextX);
    body.position.y = sanitize(nextY);

    body.acceleration.x = 0;
    body.acceleration.y = 0;
};
