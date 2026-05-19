import { describe, expect, it } from "vitest";
import snapshot from "../../../public/bootstrap/vfs-prod.json";
import { WorkspaceService } from "./WorkspaceService";

const files = snapshot as unknown as Record<string, unknown>;

const makeVfs = () => ({
    readFile: async (path: string) => files[path] ?? null,
    readText: async (path: string) => {
        const value = files[path];
        return value == null ? null : JSON.stringify(value);
    },
    writeFile: async () => undefined,
    movePaths: async () => undefined,
});

describe("WorkspaceService bootstrap snapshot", () => {
    it("loads the bundled example manifest without module parse errors", async () => {
        const linker = {
            linkProject: async () => ({
                metadata: { id: "example", version: "0.19.224" },
                blueprints: {},
            }),
        } as any;

        const service = new WorkspaceService(makeVfs() as any, linker);

        await expect(
            service.loadProject("example/manifest.json"),
        ).resolves.toBeUndefined();
        expect(service.getManifestPath()).toBe("example/manifest.json");
    });
});
