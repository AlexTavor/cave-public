// @vitest-environment jsdom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RawJsonEditor } from "./RawJsonEditor";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { clearStagedProjectVersion } from "../../../../engine/workspace/projectVersionTracker";

const vfsMock = vi.hoisted(() => ({
    listFiles: vi.fn(async () => [
        "project/manifest.json",
        "project/modules/core.cave",
    ]),
    readFile: vi.fn(async (path: string) =>
        path === "project/manifest.json"
            ? {
                  name: "Project",
                  version: "0.0.1",
                  files: ["modules/core.cave"],
              }
            : { systems: {} },
    ),
    writeFile: vi.fn(async () => undefined),
}));

vi.mock("../../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));
vi.mock("../../state/useProjectHistoryStore", () => ({
    recordProjectSnapshot: vi.fn(async () => undefined),
}));
vi.mock("../../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: { getManifestPath: () => "project/manifest.json" },
}));

describe("RawJsonEditor project versioning", () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useRealTimers();
        clearStagedProjectVersion("project/manifest.json");
    });

    it("stages one patch bump for listed project files", async () => {
        render(
            <ThemeProvider>
                <RawJsonEditor filename="modules/core.cave" />
            </ThemeProvider>,
        );
        await waitFor(() =>
            expect(vfsMock.readFile).toHaveBeenCalledWith(
                "project/modules/core.cave",
            ),
        );
        fireEvent.change(screen.getByRole("textbox"), {
            target: { value: JSON.stringify({ systems: { swarm: true } }) },
        });
        await act(async () => {
            await new Promise((resolve) => globalThis.setTimeout(resolve, 450));
        });
        await waitFor(() =>
            expect(vfsMock.writeFile).toHaveBeenCalledWith(
                "project/manifest.json",
                expect.objectContaining({ version: "0.0.2" }),
            ),
        );
    });

    it("stages a minor bump when the manifest adds a file", async () => {
        render(
            <ThemeProvider>
                <RawJsonEditor filename="manifest.json" />
            </ThemeProvider>,
        );
        await waitFor(() =>
            expect(vfsMock.readFile).toHaveBeenCalledWith(
                "project/manifest.json",
            ),
        );
        fireEvent.change(screen.getByRole("textbox"), {
            target: {
                value: JSON.stringify({
                    name: "Project",
                    version: "0.0.1",
                    files: ["modules/core.cave", "modules/swarm.bp"],
                }),
            },
        });
        await act(async () => {
            await new Promise((resolve) => globalThis.setTimeout(resolve, 450));
        });
        await waitFor(() =>
            expect(vfsMock.writeFile).toHaveBeenCalledWith(
                "project/manifest.json",
                expect.objectContaining({ version: "0.1.0" }),
            ),
        );
    });

    it("does not write on invalid json", async () => {
        render(
            <ThemeProvider>
                <RawJsonEditor filename="modules/core.cave" />
            </ThemeProvider>,
        );
        await waitFor(() => expect(vfsMock.readFile).toHaveBeenCalled());
        fireEvent.change(screen.getByRole("textbox"), {
            target: { value: "{" },
        });
        await act(async () => {
            await new Promise((resolve) => globalThis.setTimeout(resolve, 450));
        });
        expect(vfsMock.writeFile).not.toHaveBeenCalled();
    });
});
