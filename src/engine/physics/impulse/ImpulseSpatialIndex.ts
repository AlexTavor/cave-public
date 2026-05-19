import type { ImpulseConfig } from "../../../data/schemas/physics";
import { Quadtree, Rectangle } from "../quadtree/Quadtree";
import type { PhysicsBody } from "./types";

export interface SpatialIndex {
    tree: Quadtree;
    release: () => void;
}

interface WorldBounds {
    width: number | null;
    height: number | null;
}

export const buildSpatialIndex = (
    bodies: ReadonlyMap<string, PhysicsBody>,
    config: ImpulseConfig,
    worldBounds: WorldBounds,
): SpatialIndex | null => {
    const bounds = resolveBounds(bodies, config, worldBounds);
    if (!bounds) return null;

    const boundary = new Rectangle(
        bounds.minX + bounds.width / 2,
        bounds.minY + bounds.height / 2,
        bounds.width / 2,
        bounds.height / 2,
    );
    const tree = Quadtree.obtain(boundary, 8);

    // 2. Iterate again for insertion (map iterators are re-usable)
    for (const body of bodies.values()) {
        // Sync position for the tree
        body.x = body.position.x;
        body.y = body.position.y;
        if (body.layer === "phantom") continue;
        tree.insert(body);
    }

    return {
        tree,
        release: () => Quadtree.release(tree),
    };
};

const resolveBounds = (
    bodies: ReadonlyMap<string, PhysicsBody>,
    config: ImpulseConfig,
    worldBounds: WorldBounds,
): {
    minX: number;
    minY: number;
    width: number;
    height: number;
} | null => {
    // If world bounds are fixed and valid, we don't even need to iterate bodies
    if (
        worldBounds.width !== null &&
        worldBounds.height !== null &&
        worldBounds.width >= config.minWorldSize &&
        worldBounds.height >= config.minWorldSize
    ) {
        return {
            minX: 0,
            minY: 0,
            width: worldBounds.width,
            height: worldBounds.height,
        };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasBodies = false;

    // Iterate the map values directly
    for (const body of bodies.values()) {
        hasBodies = true;
        const { x, y } = body.position;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }

    if (!hasBodies) return null;

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
        return {
            minX: 0,
            minY: 0,
            width: config.minWorldSize,
            height: config.minWorldSize,
        };
    }

    const width = Math.max(
        config.minWorldSize,
        maxX - minX + config.defaultQueryRadius,
    );
    const height = Math.max(
        config.minWorldSize,
        maxY - minY + config.defaultQueryRadius,
    );

    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;

    return { minX, minY, width, height };
};
