import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import type { RuntimeEntity } from "../types";
import { mintSpawnId } from "./mintSpawnId";

const worldWithSysWorld = (
    serial?: number,
): World<RuntimeEntity> => {
    const world = new World<RuntimeEntity>();
    world.add({
        id: "sys_world",
        state: serial == null ? {} : { spawnSerial: { value: serial } },
    } as unknown as RuntimeEntity);
    return world;
};

describe("mintSpawnId", () => {
    it("mints sequential ids from the sys_world counter", () => {
        const world = worldWithSysWorld();
        expect(mintSpawnId(world)).toBe("spawn_1");
        expect(mintSpawnId(world)).toBe("spawn_2");
        expect(mintSpawnId(world)).toBe("spawn_3");
    });

    it("persists the counter on sys_world.state.spawnSerial", () => {
        const world = worldWithSysWorld();
        mintSpawnId(world);
        mintSpawnId(world);
        const sysWorld = world.entities.find((e) => e.id === "sys_world") as {
            state: { spawnSerial: { value: number; visible: boolean } };
        };
        expect(sysWorld.state.spawnSerial).toEqual({ value: 2, visible: false });
    });

    it("resumes from an existing serial (survives save/load)", () => {
        const world = worldWithSysWorld(41);
        expect(mintSpawnId(world)).toBe("spawn_42");
    });

    it("is reproducible: identical worlds mint identical id streams", () => {
        const a = worldWithSysWorld();
        const b = worldWithSysWorld();
        const streamA = [mintSpawnId(a), mintSpawnId(a), mintSpawnId(a)];
        const streamB = [mintSpawnId(b), mintSpawnId(b), mintSpawnId(b)];
        expect(streamA).toEqual(streamB);
        expect(streamA).toEqual(["spawn_1", "spawn_2", "spawn_3"]);
    });

    it("falls back to a per-world counter when sys_world is absent (no collisions)", () => {
        // Handler unit-test contexts have no sys_world; ids must still be unique.
        const world = new World<RuntimeEntity>();
        const ids = [mintSpawnId(world), mintSpawnId(world), mintSpawnId(world)];
        expect(ids).toEqual(["spawn_1", "spawn_2", "spawn_3"]);
        expect(new Set(ids).size).toBe(3);
    });

    it("labels the id with the given prefix while sharing one serial", () => {
        const world = worldWithSysWorld();
        expect(mintSpawnId(world, "spawn")).toBe("spawn_1");
        expect(mintSpawnId(world, "pending")).toBe("pending_2");
        expect(mintSpawnId(world, "spawn")).toBe("spawn_3");
    });

    it("keeps fallback counters isolated per world instance", () => {
        const a = new World<RuntimeEntity>();
        const b = new World<RuntimeEntity>();
        expect(mintSpawnId(a)).toBe("spawn_1");
        expect(mintSpawnId(a)).toBe("spawn_2");
        // b is a fresh world: starts its own count, no leakage from a.
        expect(mintSpawnId(b)).toBe("spawn_1");
    });
});
