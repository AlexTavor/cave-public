import { describe, expect, it, vi } from "vitest";
import { createCartridge } from "../../../engine/test/factories";
import { createModuleStore } from "./moduleStore";
import type { ModuleStoreIO } from "./moduleStore.io";

const moduleData = createCartridge("m");

describe("moduleStore.loadModule dedupe", () => {
    it("shares one in-flight read per filename", async () => {
        let release: () => void = () => undefined;
        const io: ModuleStoreIO = {
            readModule: vi.fn<ModuleStoreIO["readModule"]>(
                () =>
                    new Promise((resolve) => {
                        release = () => resolve(moduleData);
                    }),
            ),
            saveModule: vi.fn(async (_filename, module) => module),
        };

        const store = createModuleStore(io);
        const first = store.getState().loadModule("game_data.json");
        const second = store.getState().loadModule("game_data.json");
        expect(io.readModule).toHaveBeenCalledTimes(1);

        release();
        await Promise.all([first, second]);

        expect(store.getState().getModule("game_data.json")).toBeTruthy();
    });
});
