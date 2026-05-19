import { describe, it, expect } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { GameConfigSchema } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { resolveImpulseConfig } from "./runtimeImpulseConfig";

const makeModule = (
    settings: Partial<NonNullable<ModuleCartridge["config"]>["settings"]>,
): ModuleCartridge => ({
    metadata: {
        id: "core.json",
        name: "Core",
        version: "0.0.1",
    },
    blueprints: {},
    config: {
        traits: {},
        habiti: {},
        understanding: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: GameConfigSchema.parse({}),
            ...settings,
        },
    },
    assets: {
        displays: {},
        icons: {},
        resources: {},
        styles: {},
        settings: {
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

describe("resolveImpulseConfig", () => {
    it("uses impulse settings when valid", () => {
        // Given
        const module = makeModule({ impulse: DEFAULT_IMPULSE_CONFIG });

        // When
        const config = resolveImpulseConfig(module);

        // Then
        expect(config).toEqual(DEFAULT_IMPULSE_CONFIG);
    });

    it("falls back to defaults when invalid", () => {
        // Given
        const module = makeModule({
            impulse: {
                nope: true,
            } as unknown as NonNullable<
                ModuleCartridge["config"]
            >["settings"]["impulse"],
        });

        // When
        const config = resolveImpulseConfig(module);

        // Then
        expect(config).toEqual(DEFAULT_IMPULSE_CONFIG);
    });
});

