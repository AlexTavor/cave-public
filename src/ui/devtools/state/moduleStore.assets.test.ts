import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../../data/schemas/module";

import { ensureModuleAssets } from "./moduleStore.assets";
import { createCartridge } from "../../../engine/test/factories";

describe("moduleStore.assets", () => {
    const makeModule = (
        overrides?: Partial<ModuleCartridge> & { assets?: any },
    ): ModuleCartridge =>
        createCartridge("test.module", {
            metadata: {
                id: "test.module",
                name: "Test Module",
                version: "0.0.1",
                ...overrides?.metadata,
            },
            blueprints: overrides?.blueprints ?? {},
            assets: overrides?.assets,
        });

    describe("ensureModuleAssets", () => {
        it("adds assets when missing", () => {
            const legacy = {
                metadata: { id: "test.module", name: "Test Module" },
                blueprints: {},
            } as any as ModuleCartridge;

            const normalized = ensureModuleAssets(legacy);
            expect((normalized as any).assets).toBeTruthy();
            expect((normalized as any).assets.displays).toEqual({});
            expect((normalized as any).assets.traits).toEqual({});
            expect((normalized as any).assets.settings).toHaveProperty(
                "impulse",
            );
        });

        it("returns the same object when assets/icons already exist", () => {
            const mod = makeModule();
            const normalized = ensureModuleAssets(mod);
            expect(normalized).toBe(mod);
        });
    });
});

