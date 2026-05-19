import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Quadtree, Rectangle, Body } from "./Quadtree";

describe("Optimized Quadtree", () => {
    const boundary = new Rectangle(200, 200, 200, 200); // 0-400 size
    let qt: Quadtree;

    beforeEach(() => {
        // Always get a fresh root (though it might come from pool)
        qt = Quadtree.obtain(boundary, 4);
    });

    afterEach(() => {
        Quadtree.release(qt);
    });

    it("inserts bodies correctly", () => {
        const body: Body = { x: 50, y: 50, radius: 10, entity: "A" };
        const result = qt.insert(body);
        expect(result).toBe(true);
        expect(qt.queryRadius(50, 50, 10)).toHaveLength(1);
    });

    it("ignores bodies outside boundary", () => {
        const body: Body = { x: 500, y: 500, radius: 10, entity: "Out" };
        const result = qt.insert(body);
        expect(result).toBe(false);
        expect(qt.queryRadius(500, 500, 50)).toHaveLength(0);
    });

    it("subdivides when capacity exceeded", () => {
        // Insert 5 items (capacity 4)
        qt.insert({ x: 10, y: 10, radius: 5, entity: 1 });
        qt.insert({ x: 10, y: 10, radius: 5, entity: 2 });
        qt.insert({ x: 10, y: 10, radius: 5, entity: 3 });
        qt.insert({ x: 10, y: 10, radius: 5, entity: 4 });

        // Tree should be undivided here
        expect((qt as any).divided).toBe(false);

        // 5th item forces subdivision
        qt.insert({ x: 300, y: 300, radius: 5, entity: 5 });
        expect((qt as any).divided).toBe(true);
    });

    it("queryRadius finds overlapping items", () => {
        // Place item at 100,100
        qt.insert({ x: 100, y: 100, radius: 10, entity: "Target" });

        // Query far away
        const far = qt.queryRadius(300, 300, 10);
        expect(far).toHaveLength(0);

        // Query overlapping
        const near = qt.queryRadius(110, 100, 10);
        expect(near).toHaveLength(1);
        expect(near[0].entity).toBe("Target");
    });

    it("clears and recycles nodes", () => {
        qt.insert({ x: 10, y: 10, radius: 5, entity: 1 });
        qt.insert({ x: 300, y: 300, radius: 5, entity: 2 }); // Forces subdivision if capacity=1 for test

        // Force split logic
        const smallQT = Quadtree.obtain(boundary, 1);
        smallQT.insert({ x: 10, y: 10, radius: 5, entity: 1 });
        smallQT.insert({ x: 300, y: 300, radius: 5, entity: 2 });

        expect((smallQT as any).divided).toBe(true);
        expect((smallQT as any).ne).toBeDefined();

        // Clear should reset internal state
        smallQT.clear();
        expect((smallQT as any).divided).toBe(false);
        expect((smallQT as any).ne).toBeNull();
        expect(smallQT.queryRadius(0, 0, 400)).toHaveLength(0);

        Quadtree.release(smallQT);
    });

    it("prevents stack overflow when multiple bodies occupy the same position", () => {
        // Regression test for infinite recursion on stacked points
        // Insert many items at the exact same coordinate.
        // This forces repeated subdivision if no depth/size limit exists.
        const COUNT = 50; // Well above capacity of 4
        for (let i = 0; i < COUNT; i++) {
            qt.insert({ x: 200, y: 200, radius: 5, entity: `stack-${i}` });
        }

        // Should successfully insert all items without crashing
        const results = qt.queryRadius(200, 200, 10);
        expect(results).toHaveLength(COUNT);

        // Verify it didn't create an absurd number of children (internal check)
        // If it recursed deeply, we'd expect deep nesting, but here we just want survival.
    });
});
