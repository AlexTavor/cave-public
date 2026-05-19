import { describe, expect, it } from "vitest";
import {
    createBlueprint,
    createCartridge,
    createEntity,
} from "../../test/factories";
import type { UnifiedBlueprintsAbilityConfig } from "../../../data/schemas/abilities/unifiedBlueprints";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { KillHandler } from "./KillHandler";

const unified = (rows: UnifiedBlueprintsAbilityConfig) => ({
    _editor: { abilities: { unifiedBlueprints: rows } },
});

describe("KillHandler unified blueprints", () => {
    it("enqueues kills for all active peers sharing any unified tag without duplicates", () => {
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
                    unified([
                        { tag: "quest", spawnWhenPeerSpawns: true },
                        { tag: "quest", spawnWhenPeerSpawns: false },
                    ]),
                ),
                gamma: createBlueprint(
                    "gamma",
                    unified([{ tag: "bonus", spawnWhenPeerSpawns: false }]),
                ),
                delta: createBlueprint("delta"),
            },
        });
        const context = makeHandlerContext(cartridge);
        context.world.add(createEntity("alpha-1", { blueprintId: "alpha" }));
        context.world.add(createEntity("beta-1", { blueprintId: "beta" }));
        context.world.add(createEntity("gamma-1", { blueprintId: "gamma" }));
        context.world.add(createEntity("delta-1", { blueprintId: "delta" }));
        new KillHandler().handle(
            { type: RuntimeCommandType.KILL, payload: { entityId: "alpha-1" } },
            context,
        );
        const followUps =
            context.commands
                ?.drain()
                .filter(
                    (command) => command.type === RuntimeCommandType.KILL,
                ) ?? [];
        expect(
            followUps
                .map((command) => command.payload.entityId)
                .sort((left, right) => left.localeCompare(right)),
        ).toEqual(["beta-1", "gamma-1"]);
    });
});
