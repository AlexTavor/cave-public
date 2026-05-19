import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectSaveBlueprintCommand } from "./projectSaveCommand";
import {
    clearStagedProjectVersion,
    getStagedProjectVersion,
} from "../../workspace/projectVersionTracker";

const validatePayload = vi.hoisted(() => vi.fn(async () => undefined));
const writeModule = vi.hoisted(() => vi.fn(async () => undefined));
const readFile = vi.hoisted(() =>
    vi.fn(async () => ({
        name: "Project",
        version: "0.0.1",
        files: ["actors.bp"],
    })),
);

vi.mock("./projectServices", () => ({
    gatekeeper: { validatePayload },
    workspaceService: {
        getManifestPath: () => "project/manifest.json",
        moduleCache: new Map([
            [
                "actors.bp",
                {
                    metadata: {
                        id: "actors",
                        name: "actors",
                        version: "0.0.1",
                    },
                    blueprints: {
                        actors: {
                            id: "actors",
                            label: "actors",
                            tags: [],
                            components: {},
                        },
                    },
                    assets: {},
                },
            ],
        ]),
        writeModule,
    },
}));
vi.mock("../../vfs/FileSystem", () => ({
    vfs: { readFile, writeFile: vi.fn(async () => undefined) },
}));

describe("projectSaveBlueprintCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearStagedProjectVersion("project/manifest.json");
    });

    it("stages one project patch bump in VFS", async () => {
        const result = await projectSaveBlueprintCommand.execute(
            ["actors"],
            [] as any,
        );
        expect(result.type).toBe("success");
        expect(writeModule).toHaveBeenCalledWith(
            "actors.bp",
            expect.objectContaining({ blueprints: expect.any(Object) }),
        );
        expect(
            getStagedProjectVersion("project/manifest.json")?.effectiveVersion,
        ).toBe("0.0.2");
    });
});
