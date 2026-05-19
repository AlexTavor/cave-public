import { describe, expect, it } from "vitest";
import {
    createBlueprint,
    createCartridge,
    createEntity,
} from "../../test/factories";
import type { UnifiedBlueprintsAbilityConfig } from "../../../data/schemas/abilities/unifiedBlueprints";
import { CommandsManager } from "../CommandsManager";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { SpawnHandler } from "./SpawnHandler";

const unified = (rows: UnifiedBlueprintsAbilityConfig) => ({
    _editor: { abilities: { unifiedBlueprints: rows } },
});

describe("SpawnHandler unified blueprints", () => {
    it("processes peer spawns and preserves spawn extras without forwarding id", () => {
        const cartridge = createCartridge("core.json", {
            blueprints: {
                alpha: createBlueprint(
                    "alpha",
                    unified([{ tag: "quest", spawnWhenPeerSpawns: false }]),
                ),
                beta: createBlueprint(
                    "beta",
                    unified([
                        { tag: "quest", spawnWhenPeerSpawns: true },
                        { tag: "quest", spawnWhenPeerSpawns: true },
                    ]),
                ),
            },
        });
        const context = makeHandlerContext(cartridge);
        const commands = context.commands as CommandsManager;
        commands.registerHandler(new SpawnHandler() as any);
        commands.registerHandler({
            type: RuntimeCommandType.ADJUST_FACT,
            handle: () => undefined,
        } as any);
        commands.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: {
                blueprintId: "alpha",
                id: "source-id",
                parentId: "parent",
                forcedHabiti: ["alpha"],
                x: 3,
                y: 4,
            },
        });
        commands.process(context);
        expect(
            context.world.entities.map((entity) => entity.blueprintId),
        ).toEqual(["alpha", "beta"]);
        const spawnedPeer = context.world.entities.find(
            (entity) => entity.blueprintId === "beta",
        );
        expect(spawnedPeer?.id).not.toBe("source-id");
    });

    it("skips peers that are active already or not enabled for peer spawns", () => {
        const cartridge = createCartridge("core.json", {
            blueprints: {
                alpha: createBlueprint(
                    "alpha",
                    unified([
                        { tag: "quest", spawnWhenPeerSpawns: false },
                        { tag: "bonus", spawnWhenPeerSpawns: false },
                    ]),
                ),
                beta: createBlueprint(
                    "beta",
                    unified([{ tag: "quest", spawnWhenPeerSpawns: true }]),
                ),
                gamma: createBlueprint(
                    "gamma",
                    unified([{ tag: "bonus", spawnWhenPeerSpawns: false }]),
                ),
            },
        });
        const context = makeHandlerContext(cartridge);
        context.world.add(createEntity("beta-live", { blueprintId: "beta" }));
        new SpawnHandler().handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: {
                    blueprintId: "alpha",
                    parentId: "p",
                    forcedHabiti: ["h"],
                    x: 1,
                    y: 2,
                },
            },
            context,
        );
        const followUps =
            context.commands
                ?.drain()
                .filter(
                    (command) => command.type === RuntimeCommandType.SPAWN,
                ) ?? [];
        expect(followUps).toHaveLength(0);
    });
});
