// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { AssetPackEditor } from "./AssetPackEditor";

const openFileMock = vi.fn();
vi.mock("../../shell/shell", () => ({
    useShellStore: (sel: (s: { openFile: typeof openFileMock }) => unknown) =>
        sel({ openFile: openFileMock }),
}));

describe("AssetPackEditor glyphs", () => {
    it("opens glyphs editor on card click", () => {
        const screen = render(
            <ThemeProvider>
                <AssetPackEditor filename="modules/assets.art" />
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByText("Glyphs"));
        expect(openFileMock).toHaveBeenCalledWith(
            "list::modules/assets.art::assets::glyphs",
        );
    });
});
