import { describe, it, expect } from "vitest";
import { SpawnHandler } from "./SpawnHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createBlueprint, createCartridge } from "../../test/factories";

describe("SpawnHandler", () => {
    it("spawns a valid blueprint into the world", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                npc: createBlueprint("npc", { components: {} }),
            },
        });
        const context = makeHandlerContext(cartridge);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "npc" },
            },
            context,
        );

        expect(context.world.entities.length).toBe(1);
        expect(context.telemetry.log).toHaveBeenCalled();
        expect(context.commands?.drain()).toContainEqual({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "run",
                factType: "blueprint_spawned",
                factAbout: "npc",
                delta: 1,
            },
        });
    });

    it("logs an error and spawns nothing for unknown blueprints", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                npc: createBlueprint("npc", { components: {} }),
            },
        });
        const context = makeHandlerContext(cartridge);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "missing" },
            },
            context,
        );

        expect(context.world.entities.length).toBe(0);
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "tick",
            expect.stringContaining("missing"),
        );
    });

    it("respects id overrides", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                npc: createBlueprint("npc", { components: {} }),
            },
        });
        const context = makeHandlerContext(cartridge);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "npc", id: "custom-id" },
            },
            context,
        );

        expect(context.world.entities[0]?.id).toBe("custom-id");
    });

    it("updates existing sys_world in place when id already exists", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                sys_world: createBlueprint("sys_world", {
                    label: "World State",
                    components: {
                        state: {
                            health: { value: 1, visible: true },
                        },
                        display: { label: "Cave", display_key: "cave" },
                    },
                    tags: ["sys", "sys_world"],
                }),
            },
        });
        const context = makeHandlerContext(cartridge);

        const existingWorld = {
            id: "sys_world",
            label: "World",
            tags: ["sys_world"],
            state: {},
            behavior: { rules: [] },
        } as any;
        context.world.add(existingWorld);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "sys_world", id: "sys_world" },
            },
            context,
        );

        const worlds = context.world.entities.filter(
            (entity) => entity.id === "sys_world",
        );
        expect(worlds).toHaveLength(1);
        expect(worlds[0]).toBe(existingWorld);
        expect(worlds[0]?.blueprintId).toBe("sys_world");
        expect((worlds[0] as any).display).toBeUndefined();
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "tick",
            "SPAWN: updated existing 'sys_world' in place.",
        );
    });
});

