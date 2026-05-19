// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { RuntimeShellCanvas } from "./RuntimeShellCanvas";

vi.mock("../../../engine/phaser/hooks/usePhaserGame", () => ({
    usePhaserGame: vi.fn(),
}));
vi.mock("../world/SelectionOverlay", () => ({
    SelectionOverlay: () => <div />,
}));
vi.mock("../draft", () => ({ DraftOverlay: () => <div /> }));
vi.mock("../dormancy", () => ({ DormancyOverlay: () => <div /> }));
vi.mock("../modal-guidance/RuntimeModalGuidanceOverlay", () => ({
    RuntimeModalGuidanceOverlay: () => <div />,
}));

afterEach(cleanup);

describe("RuntimeShellCanvas notifications", () => {
    it("renders cave status inside the world overlay layer and keeps the runtime clock", async () => {
        Object.defineProperty(HTMLElement.prototype, "clientWidth", {
            configurable: true,
            get: () => 240,
        });
        Object.defineProperty(HTMLElement.prototype, "clientHeight", {
            configurable: true,
            get: () => 180,
        });
        // Given
        const runtime = {
            getState: () => ({ tick: 3 }),
            getEntities: () => [],
            getPhysicsBody: () => ({ position: { x: 0, y: 0 }, radius: 10 }),
            getEntity: () => ({
                id: "sys_world",
                state: {
                    food: { value: 2 },
                    heat: { value: 2 },
                    cave_tut_throttle_seen: { value: false },
                },
                cave: {
                    purge: { isActive: false },
                    mind: {
                        emotions: {
                            happiness: 1,
                            sadness: 0,
                            terror: 0,
                            curiosity: 0,
                        },
                    },
                },
            }),
        };

        // When
        render(
            <ThemeProvider>
                <TestWorldInteractionProvider
                    value={{ runtime: runtime as any }}
                >
                    <RuntimeShellCanvas />
                </TestWorldInteractionProvider>
            </ThemeProvider>,
        );

        // Then
        const notifications = screen.getByLabelText("Runtime notifications");
        expect(notifications).toBeTruthy();
        await waitFor(() => {
            expect(
                document.querySelector(
                    '[data-testid="node-overlay-viewport"] [aria-label="Cave status note"]',
                ),
            ).not.toBeNull();
        });
        expect(screen.getByLabelText("Runtime clock")).toBeTruthy();
    });
});
