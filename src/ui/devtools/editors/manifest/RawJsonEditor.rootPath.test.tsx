// @vitest-environment jsdom
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RawJsonEditor } from "./RawJsonEditor";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";

const vfsMock = vi.hoisted(() => ({
    listFiles: vi.fn(async () => ["modules/assets.art"]),
    readFile: vi.fn(async () => ({
        assets: {
            glyphs: { transfer_wood: { foo: 1 } },
        },
    })),
    writeFile: vi.fn(async () => undefined),
}));

vi.mock("../../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));

describe("RawJsonEditor rootPath", () => {
    it("reads and writes only the selected nested subtree", async () => {
        const screen = render(
            <ThemeProvider>
                <RawJsonEditor
                    filename="modules/assets.art"
                    rootPath="assets.glyphs"
                />
            </ThemeProvider>,
        );

        const input = await screen.findByRole("textbox");
        expect((input as HTMLTextAreaElement).value).toContain("transfer_wood");

        fireEvent.change(input, {
            target: { value: '{"transfer_heat":{"bar":2}}' },
        });
        await waitFor(() => {
            expect(vfsMock.writeFile).toHaveBeenCalledWith(
                "modules/assets.art",
                {
                    assets: {
                        glyphs: { transfer_heat: { bar: 2 } },
                    },
                },
            );
        });
    });
});
