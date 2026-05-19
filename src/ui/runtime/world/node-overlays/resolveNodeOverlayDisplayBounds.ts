import type { NodeOverlayDisplayBounds } from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBounds";
import { readNodeOverlayDisplayBounds } from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBoundsStore";
import { createNodeOverlayDisplayBoundsFromRadius } from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBounds";

export const resolveNodeOverlayDisplayBounds = (
    runtime: { getPhysicsBody?: (entityId: string) => any },
    entityId: string,
    publishedOverride?: NodeOverlayDisplayBounds | null,
): NodeOverlayDisplayBounds | null => {
    if (publishedOverride) return publishedOverride;
    const published = readNodeOverlayDisplayBounds(entityId);
    if (published) return published;
    const body = runtime.getPhysicsBody?.(entityId);
    if (!body) return null;
    return createNodeOverlayDisplayBoundsFromRadius({
        entityId,
        centerX: body.position.x,
        centerY: body.position.y,
        radius: body.radius,
    });
};
