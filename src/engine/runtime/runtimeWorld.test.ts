import { describe, it, expect } from "vitest";
import { World } from "miniplex";
import type { RuntimeEntity } from "./types";
import type { SysConfig } from "../../data/schemas/v2/config";
import { SysConfigSchema } from "../../data/schemas/v2/config";
import { ensureSystemEntities } from "./runtimeWorld";

const makeConfig = (overrides: Partial<SysConfig> = {}): SysConfig =>
    SysConfigSchema.parse(overrides);

describe("ensureSystemEntities", () => {
    it("bootstraps world and pointer singletons into an empty world", () => {
        // Given
        const world = new World<RuntimeEntity>();
        const config = makeConfig();

        // When
        ensureSystemEntities(world, config);

        // Then
        const ids = world.entities.map((e) => e.id);
        expect(ids).toContain("sys_world");
        expect(ids).toContain("sys_pointer");
        expect(world.entities).toHaveLength(2);
        const cave = world.entities.find(
            (e) => e.id === "sys_world",
        ) as RuntimeEntity;
        expect(cave.tags ?? []).toContain("body_provider");
        expect(cave.tags ?? []).not.toContain("storage:food");
        expect(cave.tags ?? []).not.toContain("storage:heat");
        expect(cave.state).toMatchObject({
            food: { value: 100, max: 100, preserveValueOnMaxDecrease: true },
            heat: { value: 100, max: 100, preserveValueOnMaxDecrease: true },
            auto_req_food_base_demand_per_s_0: { value: 0 },
            auto_req_food_body_demand_per_body_per_s_0: { value: 1 },
            auto_req_food_window_s_0: { value: 100 },
            auto_req_food_min_capacity_0: { value: 100 },
            auto_req_food_target_0: { value: 0 },
            auto_req_heat_min_capacity_0: { value: 100 },
        });
    });

    it("does not duplicate sys_world when already present", () => {
        // Given
        const world = new World<RuntimeEntity>();
        world.add({ id: "sys_world" } as RuntimeEntity);
        const config = makeConfig();

        // When
        ensureSystemEntities(world, config);

        // Then
        const worldEntities = world.entities.filter(
            (e) => e.id === "sys_world",
        );
        expect(worldEntities).toHaveLength(1);
    });

    it("does not duplicate sys_pointer when already present", () => {
        const world = new World<RuntimeEntity>();
        world.add({ id: "sys_pointer" } as RuntimeEntity);
        ensureSystemEntities(world, makeConfig());
        expect(
            world.entities.filter((e) => e.id === "sys_pointer"),
        ).toHaveLength(1);
    });

    it("applies config overrides to spawned entities", () => {
        // Given
        const world = new World<RuntimeEntity>();
        const config = makeConfig({
            pointer: { id: "sys_pointer", tags: ["custom"] },
        });

        // When
        ensureSystemEntities(world, config);

        // Then
        const pointer = world.entities.find((e) => e.id === "sys_pointer");
        expect(pointer).toBeDefined();
        expect((pointer as RuntimeEntity).tags).toEqual(["custom"]);
    });
});

