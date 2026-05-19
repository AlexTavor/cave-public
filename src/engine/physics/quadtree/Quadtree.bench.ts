import { describe, bench } from "vitest";
import { Quadtree, Rectangle, Body } from "./Quadtree";

describe("Quadtree Performance", () => {
    const COUNT = 1500;
    const WORLD_SIZE = 1000;
    const boundary = new Rectangle(
        WORLD_SIZE / 2,
        WORLD_SIZE / 2,
        WORLD_SIZE / 2,
        WORLD_SIZE / 2,
    );

    // Pre-generate bodies to strictly measure Tree performance, not allocation
    const bodies: Body[] = Array.from({ length: COUNT }).map((_, i) => ({
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        radius: 10 + Math.random() * 20,
        entity: i,
    }));

    // Reusable array for queries to avoid GC
    const queryBuffer: Body[] = [];

    bench("Rebuild and Query 1500 Nodes", () => {
        // 1. Obtain Root (Pool)
        const qt = Quadtree.obtain(boundary, 8); // Capacity 8 is a good balance

        // 2. Insert All
        for (let i = 0; i < COUNT; i++) {
            qt.insert(bodies[i]);
        }

        // 3. Query All (Simulate collision check for every node)
        // Each node queries its own radius + a safety margin (e.g. max neighbor radius 30)
        for (let i = 0; i < COUNT; i++) {
            const body = bodies[i];
            queryBuffer.length = 0; // Reset buffer
            qt.queryRadius(body.x, body.y, body.radius + 30, queryBuffer);
        }

        // 4. Release (Pool)
        Quadtree.release(qt);
    });
});
