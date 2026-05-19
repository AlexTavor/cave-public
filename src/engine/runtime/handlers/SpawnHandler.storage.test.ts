import { describe, expect, it } from "vitest";
import { CompilerService } from "../../compiler/CompilerService";
import { createBlueprint, createCartridge } from "../../test/factories";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { SpawnHandler } from "./SpawnHandler";

describe("SpawnHandler storage state", () => {
    it("inherits compiled storage initial values from the blueprint state", () => {
        const compiled = new CompilerService().compile(
            createBlueprint("egg", {
                components: {},
                _editor: {
                    abilities: {
                        storage: [
                            {
                                resource: "food",
                                initialValue: 3,
                                capacity: {
                                    base: 5,
                                    perBody: 0,
                                    multPerBody: 0,
                                },
                                isDefault: true,
                                entropy: {
                                    base: 0,
                                    perBody: 0,
                                    multPerBody: 0,
                                },
                                visible: true,
                                allowDeposit: true,
                                allowWithdraw: true,
                                priority: 0,
                            },
                        ],
                    },
                },
            }),
        );
        const context = makeHandlerContext(
            createCartridge("core.json", { blueprints: { egg: compiled } }),
        );

        new SpawnHandler().handle(
            { type: RuntimeCommandType.SPAWN, payload: { blueprintId: "egg" } },
            context,
        );

        expect((context.world.entities[0] as any).state.food.value).toBe(3);
    });
});
