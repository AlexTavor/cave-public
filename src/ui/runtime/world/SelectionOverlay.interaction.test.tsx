// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../lib/foundation/icon-registry/IconRegistryProvider";
import { SelectionOverlay } from "./SelectionOverlay";
import { TestWorldInteractionProvider } from "./testUtils";

const runtime = {
    getEntity: (id: string) =>
        ({
            "parent-1": {
                id: "parent-1",
                label: "Hommlet",
                display: { label: "Hommlet", description: "Village node." },
                powerSink: {
                    throttle: 0.5,
                    efficiency: 1,
                    drawFraction: {},
                    baseDemand: { body: 1, mind: 0, social: 0 },
                    allocatedDraw: { body: 1, mind: 0, social: 0 },
                    status: "nominal",
                    showThrottleSlider: true,
                },
            },
            "child-1": {
                id: "child-1",
                label: "Daylabor",
                display: { label: "Daylabor" },
                parent: { parentId: "parent-1" },
                powerSink: {
                    throttle: 0.4,
                    allocatedDraw: { body: 1, mind: 0, social: 0 },
                },
            },
        })[id] ?? null,
    getEntities: () => [],
    getCartridge: () => ({ blueprints: {} }),
    commands: { enqueue: vi.fn() },
    getState: () => ({ status: "running" }),
} as any;

afterEach(() => {
    cleanup();
});

describe("SelectionOverlay interactions", () => {
    it("blocks press events from reaching the world", () => {
        const down = vi.fn();
        document.addEventListener("mousedown", down);
        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <TestWorldInteractionProvider
                        value={{ runtime, selectedEntityId: "parent-1" }}
                    >
                        <SelectionOverlay />
                    </TestWorldInteractionProvider>
                </IconRegistryProvider>
            </ThemeProvider>,
        );
        fireEvent.mouseDown(screen.getByText("Hommlet"));

        expect(down).not.toHaveBeenCalled();
        document.removeEventListener("mousedown", down);
    });
});
