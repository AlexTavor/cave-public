import { describe, expect, it } from "vitest";
import { DisplayObjectPool } from "./DisplayObjectPool";

describe("DisplayObjectPool availableOnScene", () => {
    it("counts available pooled objects that still sit on the scene list", () => {
        const pool = new DisplayObjectPool<any>({
            create: () => ({ id: 1 }),
            reset: () => undefined,
            destroy: () => undefined,
        });
        const scene = { children: { list: [] as any[] } } as any;
        const obj = pool.acquire(scene);
        obj.scene = scene;
        scene.children.list.push(obj);

        pool.release(obj);

        expect(pool.getStats()).toMatchObject({
            available: 1,
            availableOnScene: 1,
            inUse: 0,
        });
    });
});
