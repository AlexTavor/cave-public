// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { BlueprintFileEditor } from "./BlueprintFileEditor";

const vfsMock = vi.hoisted(() => ({
    listFiles: vi.fn(async () => [
        "cave_roguelite_gdd_v2/modules/blueprints/actors.bp",
    ]),
    readFile: vi.fn(async () => ({ blueprints: {} })),
    writeFile: vi.fn(async () => undefined),
}));

vi.mock("../../../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));

describe("BlueprintFileEditor", () => {
    it("reads project bp through RawJsonEditor without module-session boot", async () => {
        render(
            <ThemeProvider>
                <BlueprintFileEditor filename="modules/blueprints/actors.bp" />
            </ThemeProvider>,
        );
        await waitFor(() => {
            expect(vfsMock.readFile).toHaveBeenCalledWith(
                "cave_roguelite_gdd_v2/modules/blueprints/actors.bp",
            );
        });
    });
});
