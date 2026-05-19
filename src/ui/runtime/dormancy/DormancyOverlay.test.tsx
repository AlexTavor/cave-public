// @vitest-environment jsdom
import { act, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../lib/foundation/icon-registry/IconRegistryProvider";
import { DormancyOverlay } from "./DormancyOverlay";
import { TestWorldInteractionProvider } from "../world/testUtils";

const renderOverlay = (state: Record<string, unknown>) => {
    const runtime = {
        getEntity: () => ({
            id: "sys_world",
            state,
            cave: {
                attributes: { body: 10, mind: 10, social: 10 },
                progression: { xp: 50, level: 3, skillpoints: 0 },
            },
        }),
        commands: { enqueue: vi.fn() },
    } as any;

    return {
        ...render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <TestWorldInteractionProvider value={{ runtime }}>
                        <DormancyOverlay />
                    </TestWorldInteractionProvider>
                </IconRegistryProvider>
            </ThemeProvider>,
        ),
        runtime,
    };
};

describe("DormancyOverlay", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
            () => 1,
        );
        vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(
            () => {},
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        cleanup();
    });

    it("renders cinematic text when dormant", async () => {
        renderOverlay({
            dormant: { value: 1, visible: false },
        });

        await act(async () => {
            vi.advanceTimersByTime(20);
        });
        await act(async () => {
            vi.advanceTimersByTime(700);
        });

        expect(
            screen.getByText("My last body dies, and I fade into darkness."),
        ).toBeDefined();
    });

    it("renders nothing when not dormant", () => {
        const { container } = renderOverlay({ food: { value: 10 } });
        expect(container.innerHTML).toBe("");
    });
});

