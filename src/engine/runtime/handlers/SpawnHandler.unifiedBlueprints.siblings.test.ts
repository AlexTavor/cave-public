import { describe, expect, it } from "vitest";
import type { UnifiedBlueprintsAbilityConfig } from "../../../data/schemas/abilities/unifiedBlueprints";
import { createBlueprint, createCartridge } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { SpawnHandler } from "./SpawnHandler";

const unified = (rows: UnifiedBlueprintsAbilityConfig) => ({
    _editor: { abilities: { unifiedBlueprints: rows } },
});

describe("SpawnHandler unified blueprint siblings", () => {
    it("spawns each eligible sibling once within the same cascade", () => {
        const cartridge = createCartridge("core.json", {
            blueprints: {
                merchant: createBlueprint(
                    "merchant",
                    unified([{ tag: "quest", spawnWhenPeerSpawns: true }]),
                ),
                lure: createBlueprint(
                    "lure",
                    unified([{ tag: "quest", spawnWhenPeerSpawns: true }]),
                ),
                kidnap: createBlueprint(
                    "kidnap",
                    unified([{ tag: "quest", spawnWhenPeerSpawns: true }]),
                ),
            },
        });
        const context = makeHandlerContext(cartridge);
        const commands = context.commands as CommandsManager;
        commands.registerHandler(new SpawnHandler() as never);
        commands.registerHandler({
            type: RuntimeCommandType.ADJUST_FACT,
            handle: () => undefined,
        } as never);

        commands.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: { blueprintId: "merchant", id: "merchant-1" },
        });
        commands.process(context);

        expect(
            context.world.entities
                .map((entity) => String(entity.blueprintId))
                .sort((left, right) => left.localeCompare(right)),
        ).toEqual(["kidnap", "lure", "merchant"]);
    });
});
