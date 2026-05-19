import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import type { useWorldInteraction } from "../context/WorldInteractionContext";
import { resolveNodeOverlayPosition } from "./nodeOverlayPosition";

export const SCREEN_SLOTS = {
    top_left: (_: number) => ({ x: 120, y: 100 }),
    top_right: (w: number) => ({ x: w - 120, y: 100 }),
    bottom_left: (_: number, h: number) => ({ x: 120, y: h - 100 }),
    bottom_right: (w: number, h: number) => ({ x: w - 120, y: h - 100 }),
    center: (w: number, h: number) => ({ x: w / 2, y: h / 2 }),
};

export const SLOT_OFFSETS = {
    top: [0, 0],
    top_right: [130, -10],
    right: [150, 24],
    bottom_right: [120, 72],
    bottom: [0, 86],
    bottom_left: [-120, 72],
    left: [-150, 24],
    top_left: [-130, -10],
} as const;

const overlaps = (left: any, right: any) =>
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y;

export const chooseNodeSlot = (
    slots: ReadonlyArray<keyof typeof SLOT_OFFSETS>,
    base: { x: number; y: number },
    occupied: Array<{ x: number; y: number; w: number; h: number }>,
) =>
    slots.find((candidate) => {
        const [dx, dy] = SLOT_OFFSETS[candidate];
        return !occupied.some((current) =>
            overlaps(
                { x: base.x + dx - 110, y: base.y + dy - 60, w: 220, h: 70 },
                current,
            ),
        );
    }) ?? slots[0];

export const resolveGuidanceBase = (
    runtime: ReturnType<typeof useWorldInteraction>["runtime"],
    camera: SerializedCameraState | null,
    width: number,
    height: number,
    targetId: string,
) => {
    const body = runtime?.getPhysicsBody(targetId);
    return body
        ? resolveNodeOverlayPosition({
              cameraState: camera,
              viewportWidth: width,
              viewportHeight: height,
              worldX: body.position.x,
              worldY: body.position.y,
              radius: body.radius,
          })
        : null;
};
