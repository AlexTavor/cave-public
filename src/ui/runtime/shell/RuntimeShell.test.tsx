// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../lib/foundation/icon-registry/IconRegistryProvider";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { RuntimeShell } from "./RuntimeShell";
import { useRuntimeStore } from "../state/useRuntimeStore";

vi.mock("../../../engine/phaser/hooks/usePhaserGame", () => ({
    usePhaserGame: vi.fn(),
}));
vi.mock("../inspector/RuntimeInspectorViewport", () => ({
    RuntimeInspectorViewport: () => (
        <div data-testid="runtime-inspector-viewport" />
    ),
}));
vi.mock("../world/SelectionOverlay", () => ({ SelectionOverlay: () => null }));
vi.mock("../draft", () => ({ DraftOverlay: () => null }));
vi.mock("../dormancy", () => ({ DormancyOverlay: () => null }));
vi.mock("../modal-guidance/RuntimeModalGuidanceOverlay", () => ({
    RuntimeModalGuidanceOverlay: () => null,
}));
const wrap = (ui: React.ReactElement) =>
    render(
        <ThemeProvider>
            <IconRegistryProvider>
                <PortalManager>{ui}</PortalManager>
            </IconRegistryProvider>
        </ThemeProvider>,
    );

afterEach(cleanup);

beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
        configurable: true,
        get: () => 240,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
        configurable: true,
        get: () => 180,
    });
});

describe("RuntimeShell", () => {
    it("renders the world canvas in both chrome modes", () => {
        wrap(<RuntimeShell chrome="minimal" />);
        expect(document.getElementById("game-canvas")).not.toBeNull();
        cleanup();
        wrap(<RuntimeShell chrome="full" />);
        expect(document.getElementById("game-canvas")).not.toBeNull();
    });

    it("disables native touch gestures on the game canvas", () => {
        wrap(<RuntimeShell chrome="minimal" />);
        expect(document.getElementById("game-canvas")?.style.touchAction).toBe(
            "none",
        );
    });

    it("shows the runtime clock only in full mode", () => {
        wrap(<RuntimeShell chrome="minimal" />);
        expect(screen.queryByLabelText("Runtime clock")).toBeNull();
        cleanup();
        wrap(<RuntimeShell chrome="full" />);
        expect(screen.getByLabelText("Runtime clock")).toBeDefined();
    });

    it("mounts the inspector viewport only in full mode", () => {
        wrap(<RuntimeShell chrome="minimal" />);
        expect(screen.queryByTestId("runtime-inspector-viewport")).toBeNull();
        cleanup();
        wrap(<RuntimeShell chrome="full" />);
        expect(screen.getByTestId("runtime-inspector-viewport")).toBeDefined();
    });

    it("shows cave status note only in full mode when runtime is present", async () => {
        useRuntimeStore.setState({
            runtime: {
                getState: () => ({ tick: 3 }),
                getEntities: () => [],
                getEntity: () => ({
                    id: "sys_world",
                    state: { food: { value: 1 }, heat: { value: 1 } },
                    cave: {
                        mind: {
                            emotions: {
                                happiness: 0.2,
                                sadness: 0.5,
                                terror: 0.1,
                                curiosity: 0.1,
                            },
                        },
                    },
                }),
                getPhysicsBody: () => ({
                    position: { x: 0, y: 0 },
                    radius: 10,
                }),
                getWorld: () => ({ entities: [] }),
                commands: { enqueue: vi.fn() },
            } as any,
        });
        wrap(<RuntimeShell chrome="minimal" hiddenUntilTick={0} />);
        expect(screen.queryByLabelText("Cave status note")).toBeNull();
        cleanup();
        wrap(<RuntimeShell chrome="full" hiddenUntilTick={0} />);
        await waitFor(() => {
            expect(screen.getByLabelText("Cave status note")).toBeDefined();
        });
        useRuntimeStore.setState({ runtime: null });
    });
});

