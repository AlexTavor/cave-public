import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createCartridge,
    createBlueprint,
} from "../../../engine/test/factories";
import { createDefaultModuleStoreIO } from "./moduleStore.io";

const vfsMock = vi.hoisted(() => ({
    listFiles: vi.fn(async () => [
        "project/modules/test.bp",
        "project/scripts/init.cvs",
    ]),
    readFile: vi.fn(),
    readText: vi.fn(),
    writeFile: vi.fn(async () => undefined),
    saveToDisk: vi.fn(async () => undefined),
}));

const bumpSaveMock = vi.hoisted(() =>
    vi.fn(async (_f: string, data: unknown) => data),
);

vi.mock("../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));
vi.mock("../utils/modulePersistence", () => ({
    saveModuleWithVersionBump: bumpSaveMock,
}));

describe("moduleStore.io semantic adapters", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("reads .bp as a synthetic module cartridge", async () => {
        vfsMock.readFile.mockResolvedValueOnce(createBlueprint("bp_test"));
        const io = createDefaultModuleStoreIO();
        const result = await io.readModule("modules/test.bp");
        expect(result?.blueprints.bp_test.id).toBe("bp_test");
    });

    it("writes only the selected blueprint for .bp", async () => {
        const io = createDefaultModuleStoreIO();
        const module = createCartridge("test", {
            blueprints: {
                test: createBlueprint("test"),
                other: createBlueprint("other"),
            },
        });
        await io.saveModule("modules/test.bp", module);
        expect(vfsMock.writeFile).toHaveBeenCalledWith(
            "project/modules/test.bp",
            expect.objectContaining({ id: "test" }),
        );
        expect(bumpSaveMock).not.toHaveBeenCalled();
    });

    it("reads .cvs script into scripts map", async () => {
        vfsMock.readFile.mockResolvedValueOnce("HELLO WORLD");
        const io = createDefaultModuleStoreIO();
        const result = await io.readModule("scripts/init.cvs");
        expect(result?.scripts?.["scripts/init.cvs"]).toBe("HELLO WORLD");
    });

    it("writes raw script text for .cvs", async () => {
        const io = createDefaultModuleStoreIO();
        const module = {
            ...createCartridge("script"),
            scripts: { "scripts/init.cvs": "RUN HELLO" },
        };
        await io.saveModule("scripts/init.cvs", module);
        expect(vfsMock.writeFile).toHaveBeenCalledWith(
            "project/scripts/init.cvs",
            "RUN HELLO",
        );
        expect(bumpSaveMock).not.toHaveBeenCalled();
    });

    it("reads .cave fragment as synthetic module cartridge", async () => {
        vfsMock.readFile.mockResolvedValueOnce({
            impulse: { defaultDtMs: 22 },
        });
        const io = createDefaultModuleStoreIO();
        const result = await io.readModule("modules/core.cave");
        expect(result?.metadata.id).toBe("core");
        expect(result?.config?.settings?.impulse.defaultDtMs).toBe(22);
    });

    it("writes .cave as semantic fragment", async () => {
        const io = createDefaultModuleStoreIO();
        const module = createCartridge("core", {
            config: {
                traits: {},
                settings: {
                    impulse: {
                        ...createCartridge("x").config!.settings.impulse,
                        defaultDtMs: 30,
                    },
                    game_config:
                        createCartridge("x").config!.settings.game_config,
                },
            },
        });
        await io.saveModule("modules/core.cave", module);
        expect(vfsMock.writeFile).toHaveBeenCalledWith(
            "modules/core.cave",
            expect.objectContaining({
                impulse: expect.objectContaining({ defaultDtMs: 30 }),
            }),
        );
        expect(bumpSaveMock).not.toHaveBeenCalled();
    });
});

