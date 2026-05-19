// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { createRuntimeTestDouble } from "../world/testUtils";
import { RuntimeModalGuidanceOverlay } from "./RuntimeModalGuidanceOverlay";

describe("RuntimeModalGuidanceOverlay", () => {
    beforeEach(() => useRuntimeStore.setState({ runtime: null }));
    afterEach(() => {
        cleanup();
        useRuntimeStore.setState({ runtime: null });
    });

    it("renders tutorial modal guidance and acknowledges on continue", () => {
        const enqueue = vi.fn();
        const stepOncePreservingPause = vi.fn();
        const flushCommands = vi.fn();
        useRuntimeStore.setState({
            runtime: {
                commands: { enqueue },
                flushCommands,
                getState: () => ({ status: "paused" }),
                stepOncePreservingPause,
                getCartridge: () => ({
                    config: {
                        settings: {
                            guidances: [
                                {
                                    id: "g1",
                                    presentation: "modal",
                                    title: "Guide",
                                    text: "Fallback",
                                    imageUrl: null,
                                    attention: [],
                                },
                            ],
                        },
                    },
                }),
                getEntity: () => ({
                    tutorial: {
                        active: true,
                        bindings: [
                            {
                                bindingId: "bind-1",
                                guidanceId: "g1",
                                targetId: null,
                                selfTargetId: null,
                                targetOptionId: null,
                                titleOverride: "Override title",
                                textOverride: "Body",
                            },
                        ],
                        attention: {
                            hideNotifications: false,
                            hideTimeControls: true,
                            pauseGame: true,
                            focusEntityIds: [],
                            ringEntityIds: [],
                            cameraFocusEntityId: null,
                            blockNonFocusedInteraction: false,
                        },
                    },
                }),
            } as any,
        });

        render(
            <ThemeProvider>
                <PortalManager>
                    <RuntimeModalGuidanceOverlay />
                </PortalManager>
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByText("CONTINUE"));

        expect(screen.getByText(/Override title/)).toBeDefined();
        expect(enqueue).toHaveBeenCalledWith({
            type: "ACKNOWLEDGE_TUTORIAL_MODAL_GUIDANCE",
            payload: { bindingId: "bind-1" },
        });
        expect(stepOncePreservingPause).toHaveBeenCalledTimes(1);
        expect(flushCommands).toHaveBeenCalledTimes(1);
    });

    it("closes a paused tutorial modal immediately after continue", () => {
        const world: any = {
            tutorial: {
                active: true,
                acknowledgedModalBindingId: null,
                bindings: [
                    {
                        bindingId: "bind-1",
                        guidanceId: "g1",
                        targetId: null,
                        selfTargetId: null,
                        targetOptionId: null,
                        titleOverride: "Override title",
                        textOverride: "Body",
                    },
                ],
                attention: {
                    hideNotifications: false,
                    hideTimeControls: true,
                    pauseGame: true,
                    focusEntityIds: [],
                    ringEntityIds: [],
                    cameraFocusEntityId: null,
                    blockNonFocusedInteraction: false,
                },
            },
        };
        const queued: any[] = [];
        let runtimeDouble: ReturnType<typeof createRuntimeTestDouble>;
        runtimeDouble = createRuntimeTestDouble({
            commands: { enqueue: vi.fn((command) => queued.push(command)) },
            flushCommands: vi.fn(),
            getCartridge: () => ({
                config: {
                    settings: {
                        guidances: [
                            {
                                id: "g1",
                                presentation: "modal",
                                title: "Guide",
                                text: "Fallback",
                                imageUrl: null,
                                attention: [],
                            },
                        ],
                    },
                },
            }),
            getEntity: () => world,
            getState: () => ({ status: "paused" }),
            stepOncePreservingPause: vi.fn(() => {
                const command = queued.shift();
                world.tutorial = null;
                runtimeDouble.emitMutation({
                    changedEntityIds: ["sys_world"],
                    entityListChanged: false,
                    blueprintChanged: false,
                });
                return command ? 1 : 0;
            }),
        });
        useRuntimeStore.setState({ runtime: runtimeDouble.runtime as any });

        render(
            <ThemeProvider>
                <PortalManager>
                    <RuntimeModalGuidanceOverlay />
                </PortalManager>
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByText("CONTINUE"));

        expect(screen.queryByText(/Override title/)).toBeNull();
    });
});
