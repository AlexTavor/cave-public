import { describe, expect, it, vi } from "vitest";
import { fileCache } from "../fileUtils";

const loadProjectMock = vi.hoisted(() => vi.fn());
const closeProjectMock = vi.hoisted(() => vi.fn());
const activeCartridgeRef = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("./projectServices", () => ({
    workspaceService: {
        loadProject: loadProjectMock,
        get activeCartridge() {
            return activeCartridgeRef.value;
        },
        createProject: vi.fn(),
        closeProject: closeProjectMock,
    },
    refactorService: {
        moveNamespace: vi.fn(),
    },
}));

import { projectCommands } from "./projectCommands";

const projectLoad = projectCommands.find((cmd) => cmd.name === "project-load")!;
const projectClose = projectCommands.find(
    (cmd) => cmd.name === "project-close",
)!;

describe("project-load command", () => {
    it("autocompletes manifest.json paths", () => {
        fileCache.length = 0;
        fileCache.push("demo/manifest.json", "manifest.json", "demo/game.bp");
        const suggestions = projectLoad.autocomplete?.(["de"], {} as any) ?? [];
        expect(suggestions.some((s) => s.label === "demo/manifest.json")).toBe(
            true,
        );
    });

    it("loads project and initializes runtime when available", async () => {
        const cartridge = {
            metadata: { id: "p", name: "p", version: "0.0.1" },
            blueprints: {},
            assets: {},
        };
        activeCartridgeRef.value = cartridge;
        loadProjectMock.mockResolvedValue(undefined);
        const loadCartridge = vi.fn();

        const result = await projectLoad.execute(["p/manifest.json"], {
            registry: {
                getCommand: vi.fn(),
                getAllCommands: vi.fn(),
                execute: vi.fn(),
            },
            runtime: {
                getActiveEntityIds: () => [],
                getLoadedBlueprintIds: () => [],
                loadCartridge,
            },
        });

        expect(result.type).toBe("success");
        expect(loadProjectMock).toHaveBeenCalledWith("p/manifest.json");
        expect(loadCartridge).toHaveBeenCalledTimes(1);
        const loaded = loadCartridge.mock.calls[0][0];
        expect(loaded.metadata.name).toBe("p");
        expect(loaded.draftOptions).toEqual({});
        expect(loaded.draftPools).toEqual({});
    });

    it("returns info when runtime bootstrap fails after load", async () => {
        activeCartridgeRef.value = {
            metadata: { id: "p", version: "0.0.1" },
            blueprints: {},
            assets: {},
        };
        loadProjectMock.mockResolvedValue(undefined);
        const loadCartridge = vi.fn(() => {
            throw new Error("bad cartridge");
        });

        const result = await projectLoad.execute(["p/manifest.json"], {
            registry: {
                getCommand: vi.fn(),
                getAllCommands: vi.fn(),
                execute: vi.fn(),
            },
            runtime: {
                getActiveEntityIds: () => [],
                getLoadedBlueprintIds: () => [],
                loadCartridge,
            },
        } as any);

        expect(result.type).toBe("info");
        expect(result.content).toEqual(
            expect.stringContaining("runtime bootstrap failed"),
        );
        expect(loadProjectMock).toHaveBeenCalledWith("p/manifest.json");
    });

    it("closes workspace, runtime, and ui state on project-close", async () => {
        const unload = vi.fn();
        const closeWorkspace = vi.fn();

        const result = await projectClose.execute([], {
            registry: {
                getCommand: vi.fn(),
                getAllCommands: vi.fn(),
                execute: vi.fn(),
            },
            runtime: {
                getActiveEntityIds: () => [],
                getLoadedBlueprintIds: () => [],
                unload,
            },
            ui: { openFile: vi.fn(), closeFile: vi.fn(), closeWorkspace },
        });

        expect(result.type).toBe("success");
        expect(closeProjectMock).toHaveBeenCalledTimes(1);
        expect(unload).toHaveBeenCalledTimes(1);
        expect(closeWorkspace).toHaveBeenCalledTimes(1);
    });
});
