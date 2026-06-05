import { describe, expect, it } from "vitest";
import { createBlueprint, createCartridge } from "../../test/factories";
import { RuntimeCommandType } from "../types";
import type { SpawnCommand } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { SpawnHandler } from "./SpawnHandler";

const spawnCommand = (payload: SpawnCommand["payload"]): SpawnCommand => ({
    type: RuntimeCommandType.SPAWN,
    payload,
});

describe("SpawnHandler deferred assignment", () => {
    it("mints a deterministic id and enqueues the body→owner assignment", () => {
        const cartridge = createCartridge("core.json", {
            blueprints: { drone: createBlueprint("drone") },
        });
        const context = makeHandlerContext(cartridge);

        new SpawnHandler().handle(
            spawnCommand({ blueprintId: "drone", assignTo: "nest-7" }),
            context,
        );

        const spawned = context.world.entities.find(
            (entity) => entity.blueprintId === "drone",
        );
        expect(spawned?.id).toMatch(/^spawn_\d+$/);

        const enqueued = (context.commands as { drain: () => unknown[] }).drain();
        const assign = enqueued.find(
            (command) =>
                (command as { type?: string }).type ===
                RuntimeCommandType.ASSIGN_BODIES_BATCH,
        ) as
            | {
                  payload: {
                      updates: { bodyId: string; ownerId: string }[];
                  };
              }
            | undefined;
        expect(assign).toBeDefined();
        expect(assign?.payload.updates).toEqual([
            { bodyId: spawned?.id, ownerId: "nest-7" },
        ]);
    });

    it("does not enqueue an assignment when assignTo is absent", () => {
        const cartridge = createCartridge("core.json", {
            blueprints: { drone: createBlueprint("drone") },
        });
        const context = makeHandlerContext(cartridge);

        new SpawnHandler().handle(
            spawnCommand({ blueprintId: "drone" }),
            context,
        );

        const enqueued = (context.commands as { drain: () => unknown[] }).drain();
        expect(
            enqueued.every(
                (command) =>
                    (command as { type?: string }).type !==
                    RuntimeCommandType.ASSIGN_BODIES_BATCH,
            ),
        ).toBe(true);
    });
});
