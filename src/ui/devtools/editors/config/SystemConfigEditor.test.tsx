// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { SystemConfigEditor } from "./SystemConfigEditor";

const vfsMock = vi.hoisted(() => ({
    listFiles: vi.fn(async () => ["modules/core.cave"]),
    readFile: vi.fn(async () => ({ gravity: 1 })),
}));
vi.mock("../../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));

describe("SystemConfigEditor", () => {
    it("renders without module-session loading", async () => {
        render(
            <ThemeProvider>
                <SystemConfigEditor filename="modules/core.cave" />
            </ThemeProvider>,
        );
        expect(screen.getByText("System Config")).toBeDefined();
    });
});
