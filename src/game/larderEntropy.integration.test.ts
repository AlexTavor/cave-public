import { describe, expect, it } from "vitest";
import { createGame } from "./main";
import { CompilerService } from "../engine/compiler/CompilerService";
import { createBlueprint } from "../engine/test/factories";
import type { ModuleCartridge } from "../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../data/schemas/assets";

const makeCartridge = (): ModuleCartridge => ({
    metadata: { id: "test", name: "Test", version: "0.0.1" },
    blueprints: {},
    assets: {
        displays: {},
        icons: {},
        resources: {},
        styles: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

describe("larder entropy runtime", () => {
    it("drains at one unit per second even after recompilation", () => {
        const compiler = new CompilerService();
        const raw = createBlueprint("larder", {
            components: {},
            _editor: {
                abilities: {
                    storage: [
                        {
                            resource: "food",
                            capacity: {
                                base: 1200,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            entropy: { base: 1, perBody: 0, multPerBody: 0 },
                            visible: true,
                            allowDeposit: true,
                            allowWithdraw: true,
                            priority: 5,
                        },
                    ],
                },
            } as any,
        });
        const compiled = compiler.compile(compiler.compile(raw));
        const runtime = createGame(makeCartridge(), "seed");

        runtime.addEntity({
            id: "larder_1",
            ...compiled.components,
            state: {
                ...compiled.components.state,
                food: { value: 10, max: 1200, visible: true },
            },
        } as any);
        for (let i = 0; i < 50; i += 1) runtime.tick(20);

        expect(
            (runtime.getEntity("larder_1") as any)?.state?.food?.value,
        ).toBeCloseTo(9, 1);
    });
});
