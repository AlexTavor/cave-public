// @vitest-environment jsdom
import { fireEvent, render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { AssetPackEditor } from "./AssetPackEditor";

const openFileMock = vi.fn();
vi.mock("../../shell/shell", () => ({
    useShellStore: (sel: (s: any) => any) => sel({ openFile: openFileMock }),
}));

afterEach(() => {
    cleanup();
    openFileMock.mockClear();
});

const renderEditor = (filename: string) =>
    render(
        <ThemeProvider>
            <AssetPackEditor filename={filename} />
        </ThemeProvider>,
    );

describe("AssetPackEditor dashboard", () => {
    it("opens displays list on card click", () => {
        const { getByText } = renderEditor("modules/assets.art");
        fireEvent.click(getByText("Displays"));
        expect(openFileMock).toHaveBeenCalledWith(
            "list::modules/assets.art::assets::displays",
        );
    });

    it("opens styles list on card click", () => {
        const { getByText } = renderEditor("modules/assets.art");
        fireEvent.click(getByText("Styles"));
        expect(openFileMock).toHaveBeenCalledWith(
            "list::modules/assets.art::assets::styles",
        );
    });

    it("opens background config on card click", () => {
        const { getByText } = renderEditor("modules/assets.art");
        fireEvent.click(getByText("Background"));
        expect(openFileMock).toHaveBeenCalledWith(
            "background_config::modules/assets.art",
        );
    });

    it("opens vein config on card click", () => {
        const { getByText } = renderEditor("modules/assets.art");
        fireEvent.click(getByText("Vein Network"));
        expect(openFileMock).toHaveBeenCalledWith(
            "vein_config::modules/assets.art",
        );
    });
});

