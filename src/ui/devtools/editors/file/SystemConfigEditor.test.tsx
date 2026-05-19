// @vitest-environment jsdom
import { fireEvent, render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { SystemConfigEditor } from "./SystemConfigEditor";

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
            <SystemConfigEditor filename={filename} />
        </ThemeProvider>,
    );

describe("SystemConfigEditor dashboard", () => {
    it("opens physics on card click", () => {
        const { getByText } = renderEditor("modules/core.cave");
        fireEvent.click(getByText("Impulse Physics"));
        expect(openFileMock).toHaveBeenCalledWith("physics::modules/core.cave");
    });

    it("opens game config on card click", () => {
        const { getByText } = renderEditor("modules/core.cave");
        fireEvent.click(getByText("Game Config"));
        expect(openFileMock).toHaveBeenCalledWith(
            "game_config::modules/core.cave",
        );
    });

    it("opens global traits on card click", () => {
        const { getByText } = renderEditor("modules/core.cave");
        fireEvent.click(getByText("Global Traits"));
        expect(openFileMock).toHaveBeenCalledWith("traits::modules/core.cave");
    });

    it("opens conditions on card click", () => {
        const { getByText } = renderEditor("modules/core.cave");
        fireEvent.click(getByText("Conditions"));
        expect(openFileMock).toHaveBeenCalledWith(
            "conditions::modules/core.cave",
        );
    });

    it("opens tutorials on card click", () => {
        const { getByText } = renderEditor("modules/core.cave");
        fireEvent.click(getByText("Tutorials"));
        expect(openFileMock).toHaveBeenCalledWith(
            "tutorials::modules/core.cave",
        );
    });

    it("opens codex on card click", () => {
        const { getByText } = renderEditor("modules/core.cave");
        fireEvent.click(getByText("Codex"));
        expect(openFileMock).toHaveBeenCalledWith(
            "knowledge::modules/core.cave",
        );
    });

    it("opens camera world on card click", () => {
        const { getByText } = renderEditor("modules/core.cave");
        fireEvent.click(getByText("Camera + World"));
        expect(openFileMock).toHaveBeenCalledWith(
            "camera_world::modules/core.cave",
        );
    });
});

