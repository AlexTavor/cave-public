// @vitest-environment jsdom
import React from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { TelemetryView } from "./TelemetryView";
import { useTelemetryStore } from "../../runtime/state/useTelemetryStore";
import { useRuntimeToolStore } from "../../runtime/state/useRuntimeToolStore";

vi.mock("react-virtuoso", () => ({
    Virtuoso: ({ data, itemContent }: any) => (
        <div data-testid="virtuoso">
            {data.map((item: any, index: number) => (
                <div key={item.id ?? index}>{itemContent(index, item)}</div>
            ))}
        </div>
    ),
}));

const renderWithTheme = (ui: React.ReactElement) =>
    render(<ThemeProvider>{ui}</ThemeProvider>);

afterEach(() => {
    cleanup();
});

beforeEach(() => {
    useTelemetryStore.setState({
        sticky: {},
        streams: {
            tick: [],
            systems: [
                {
                    id: "sys-1",
                    timestamp: Date.now(),
                    message: "systems online",
                    severity: "info",
                },
            ],
            errors: [],
        },
    });

    useRuntimeToolStore.setState({
        isTerminalOpen: false,
        isTelemetryOpen: true,
        activeTelemetryTab: "runtime",
        selectedEntityId: null,
    });
});

describe("TelemetryView", () => {
    it("switches tabs and updates content", () => {
        renderWithTheme(<TelemetryView />);

        fireEvent.click(screen.getByText("Systems"));

        const content = screen.getByTestId("telemetry-content");
        expect(content.dataset.tab).toBe("systems");
        expect(screen.getByText("systems online")).toBeDefined();
    });
});
