// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RawJsonEditor } from "./RawJsonEditor";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";

const vfsMock = vi.hoisted(() => ({
    listFiles: vi.fn(async () => ["cave_roguelite_gdd_v2/modules/core.cave"]),
    readFile: vi.fn(async () => ({ systems: {} })),
    writeFile: vi.fn(async () => undefined),
}));

vi.mock("../../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));

describe("RawJsonEditor", () => {
    it("reads through resolved VFS path for project-relative filenames", async () => {
        render(
            <ThemeProvider>
                <RawJsonEditor filename="modules/core.cave" />
            </ThemeProvider>,
        );
        await waitFor(() => {
            expect(vfsMock.readFile).toHaveBeenCalledWith(
                "cave_roguelite_gdd_v2/modules/core.cave",
            );
        });
    });
});
