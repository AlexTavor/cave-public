import { describe, it, expect } from "vitest";
import { DisplayObjectPool } from "./DisplayObjectPool";

describe("DisplayObjectPool", () => {
    const createTestPool = () => {
        let nextId = 0;
        const destroyed: number[] = [];
        const resetCalls: number[] = [];

        return {
            pool: new DisplayObjectPool<{ id: number; value: string }>({
                create: () => ({ id: nextId++, value: "new" }),
                reset: (obj) => {
                    obj.value = "reset";
                    resetCalls.push(obj.id);
                },
                destroy: (obj) => {
                    destroyed.push(obj.id);
                },
            }),
            destroyed,
            resetCalls,
        };
    };

    const fakeScene = {} as any;

    it("acquire creates new objects", () => {
        const { pool } = createTestPool();
        const obj = pool.acquire(fakeScene);
        expect(obj.id).toBe(0);
        expect(obj.value).toBe("new");
    });

    it("release and acquire reuses objects", () => {
        const { pool, resetCalls } = createTestPool();
        const obj = pool.acquire(fakeScene);
        pool.release(obj);
        const reused = pool.acquire(fakeScene);
        expect(reused).toBe(obj);
        expect(reused.value).toBe("reset");
        expect(resetCalls).toContain(obj.id);
    });

    it("drainAndDestroy destroys all pooled objects", () => {
        const { pool, destroyed } = createTestPool();
        const a = pool.acquire(fakeScene);
        const b = pool.acquire(fakeScene);
        pool.release(a);
        pool.release(b);
        pool.drainAndDestroy();
        expect(destroyed).toContain(a.id);
        expect(destroyed).toContain(b.id);
    });

    it("drainAndDestroy is idempotent", () => {
        const { pool, destroyed } = createTestPool();
        const a = pool.acquire(fakeScene);
        pool.release(a);
        pool.drainAndDestroy();
        pool.drainAndDestroy();
        expect(destroyed.length).toBe(1);
    });
});
