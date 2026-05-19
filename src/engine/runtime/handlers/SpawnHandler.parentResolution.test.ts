import { afterEach, describe, expect, it, vi } from "vitest";
import { SpawnHandler } from "./SpawnHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createBlueprint, createCartridge } from "../../test/factories";

describe("SpawnHandler parent resolution", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("resolves passport-authored parent selectors by tag", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                child: createBlueprint("child", {
                    components: {
                        parent: { kind: "entity_tag", tag: "nest" },
                    } as any,
                }),
            },
        });
        const context = makeHandlerContext(cartridge);
        context.world.add({ id: "parent-a", tags: ["nest"] } as any);
        context.world.add({ id: "parent-b", tags: ["nest"] } as any);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "child" },
            },
            context,
        );

        expect((context.world.entities[2] as any).parent).toEqual({
            parentId: "parent-a",
        });
    });

    it("resolves passport-authored parent selectors by id", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                child: createBlueprint("child", {
                    components: {
                        parent: { kind: "entity_id", entityId: "root" },
                    } as any,
                }),
            },
        });
        const context = makeHandlerContext(cartridge);
        context.world.add({ id: "root" } as any);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "child" },
            },
            context,
        );

        expect((context.world.entities[1] as any).parent).toEqual({
            parentId: "root",
        });
    });

    it("warns and continues without a parent when no selector match exists", () => {
        const warn = vi
            .spyOn(console, "warn")
            .mockImplementation(() => undefined);
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                child: createBlueprint("child", {
                    components: {
                        parent: { kind: "entity_tag", tag: "nest" },
                    } as any,
                }),
            },
        });
        const context = makeHandlerContext(cartridge);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "child" },
            },
            context,
        );

        expect((context.world.entities[0] as any).parent).toBeUndefined();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("continues without a parent"),
        );
    });
});
