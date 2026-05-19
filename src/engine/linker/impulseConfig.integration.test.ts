import { describe, it, expect } from "vitest";
import { ModuleLinker } from "./ModuleLinker";
import { toModuleCartridge } from "../terminal/commands/projectCartridgeAdapter";
import { resolveImpulseConfig } from "../runtime/runtimeImpulseConfig";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";

const makeFs = (db: Record<string, unknown>) => ({
    readText: async (path: string) => {
        const val = db[path];
        return val == null ? null : JSON.stringify(val);
    },
});

const CUSTOM_IMPULSE = {
    globalDrag: 0.15,
    seekStrength: 777,
    separationStrength: 12.5,
    avoidanceForce: 3.3,
};

describe("Impulse config integration (HLL → compile → runtime)", () => {
    it("preserves custom impulse values through the full pipeline", async () => {
        // Given — a .cave file with custom impulse settings
        const db = {
            "p/manifest.json": { files: ["core.cave", "bp.bp"] },
            "p/core.cave": { impulse: CUSTOM_IMPULSE, game_config: {} },
            "p/bp.bp": { w: { id: "w", label: "W", components: {} } },
        };

        // When — link, adapt to ModuleCartridge, resolve impulse config
        const linked = await new ModuleLinker(makeFs(db) as any).linkProject(
            "p",
        );
        const cartridge = toModuleCartridge(linked);
        const resolved = resolveImpulseConfig(cartridge);

        // Then — custom values survive; defaults fill unset fields
        expect(resolved.globalDrag).toBe(CUSTOM_IMPULSE.globalDrag);
        expect(resolved.seekStrength).toBe(CUSTOM_IMPULSE.seekStrength);
        expect(resolved.separationStrength).toBe(
            CUSTOM_IMPULSE.separationStrength,
        );
        expect(resolved.avoidanceForce).toBe(CUSTOM_IMPULSE.avoidanceForce);
        expect(resolved.subSteps).toBe(DEFAULT_IMPULSE_CONFIG.subSteps);
    });

    it("uses defaults when .cave omits impulse", async () => {
        // Given — no impulse in the .cave file
        const db = {
            "p/manifest.json": { files: ["core.cave"] },
            "p/core.cave": { game_config: {} },
        };

        // When
        const linked = await new ModuleLinker(makeFs(db) as any).linkProject(
            "p",
        );
        const cartridge = toModuleCartridge(linked);
        const resolved = resolveImpulseConfig(cartridge);

        // Then
        expect(resolved).toEqual(DEFAULT_IMPULSE_CONFIG);
    });
});
