// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { MainMenuPanel } from "./MainMenuPanel";
import {
    getNodeOverlaysEnabled,
    setNodeOverlaysEnabled,
} from "../../runtime/world/node-overlays/nodeOverlayToggle";
import {
    getNodeOverlayValuesEnabled,
    setNodeOverlayValuesEnabled,
} from "../../runtime/world/node-overlays/nodeOverlayValuesToggle";

const getStatsVisible = vi.hoisted(() => vi.fn(() => false));
const setStatsVisible = vi.hoisted(() => vi.fn());

vi.mock("../../../setStats", () => ({ getStatsVisible, setStatsVisible }));

afterEach(() => {
    cleanup();
    setNodeOverlaysEnabled(true);
    setNodeOverlayValuesEnabled(false);
    getStatsVisible.mockReturnValue(false);
    setStatsVisible.mockReset();
});

const renderPanel = () =>
    render(
        <ThemeProvider>
            <MainMenuPanel
                actions={[]}
                errorText={null}
                statusText="Ready"
                subtitle="Subtitle"
                title="Title"
            />
        </ThemeProvider>,
    );

describe("MainMenuPanel", () => {
    it("toggles the local FPS overlay state", () => {
        renderPanel();
        const checkbox = screen.getByRole("checkbox", { name: /Show FPS/ });
        fireEvent.click(checkbox);
        expect(setStatsVisible).toHaveBeenLastCalledWith(true);
    });

    it("keeps FPS enabled when the menu unmounts and reflects existing visibility", () => {
        getStatsVisible.mockReturnValue(true);
        const { unmount } = renderPanel();
        const checkbox = screen.getByRole("checkbox", { name: /Show FPS/ });
        expect(checkbox).toHaveProperty("checked", true);
        unmount();
        expect(setStatsVisible).toHaveBeenLastCalledWith(true);
    });

    it("shows the node overlays toggle and reflects persisted state", () => {
        setNodeOverlaysEnabled(false);
        renderPanel();
        expect(
            screen.getByRole("checkbox", { name: /Node Overlays/ }),
        ).toHaveProperty("checked", false);
    });

    it("updates persisted state when the toggle changes", () => {
        renderPanel();
        fireEvent.click(
            screen.getByRole("checkbox", { name: /Node Overlays/ }),
        );
        expect(getNodeOverlaysEnabled()).toBe(false);
    });

    it("shows node overlay values disabled by default and updates persisted state", () => {
        renderPanel();
        const checkbox = screen.getByRole("checkbox", {
            name: /Node Overlay Values/,
        });
        expect(checkbox).toHaveProperty("checked", false);
        fireEvent.click(checkbox);
        expect(getNodeOverlayValuesEnabled()).toBe(true);
    });
});
