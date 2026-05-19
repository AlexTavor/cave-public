// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../lib/foundation/icon-registry/IconRegistryProvider";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { DraftOverlay } from "./DraftOverlay";

const renderOverlay = (
    runtime: any,
    draft: any,
    tutorialBindings: any[] = [],
) =>
    render(
        <ThemeProvider>
            <PortalManager>
                <IconRegistryProvider>
                    <TestWorldInteractionProvider
                        value={{
                            runtime:
                                runtime ??
                                ({
                                    getEntity: () => ({
                                        id: "sys_world",
                                        draft,
                                        tutorial: {
                                            active: tutorialBindings.length > 0,
                                            bindings: tutorialBindings,
                                        },
                                    }),
                                    commands: { enqueue: vi.fn() },
                                } as any),
                        }}
                    >
                        <DraftOverlay />
                    </TestWorldInteractionProvider>
                </IconRegistryProvider>
            </PortalManager>
        </ThemeProvider>,
    );

const draft = {
    active: true,
    sourceLabel: "Level Up",
    selectedOptionId: null,
    cycleNumber: 0,
    currentText: "",
    options: [
        {
            id: "a",
            title: "Option A",
            description: "A",
            rarity: "common",
            icon: "wood",
        },
        {
            id: "b",
            title: "Option B",
            description: "B",
            rarity: "common",
            icon: "wood",
        },
    ],
};

describe("DraftOverlay guided options", () => {
    afterEach(() => {
        cleanup();
        useRuntimeStore.setState({ runtime: null, status: "idle" } as any);
    });

    it("leaves all cards enabled without active draft guidance", () => {
        renderOverlay(null, draft);
        const buttons = screen.getAllByRole("button");
        expect(buttons[0].hasAttribute("disabled")).toBe(false);
        expect(buttons[1].hasAttribute("disabled")).toBe(false);
    });

    it("disables non-target cards when the guided option exists", () => {
        renderOverlay(null, draft, [{ targetOptionId: "a" }]);
        const buttons = screen.getAllByRole("button");
        expect(buttons[0].hasAttribute("disabled")).toBe(false);
        expect(buttons[1].hasAttribute("disabled")).toBe(true);
    });

    it("leaves all cards enabled when the guided option is missing", () => {
        renderOverlay(null, draft, [{ targetOptionId: "missing" }]);
        const buttons = screen.getAllByRole("button");
        expect(buttons[0].hasAttribute("disabled")).toBe(false);
        expect(buttons[1].hasAttribute("disabled")).toBe(false);
    });

    it("flushes queued commands when auto-pausing an opened draft", () => {
        const flushCommands = vi.fn();
        const pause = vi.fn();
        const runtime = {
            flushCommands,
            getCartridge: () => ({ config: { settings: {} } }),
            getEntity: () => ({
                id: "sys_world",
                draft,
                tutorial: { active: false, bindings: [] },
            }),
            commands: { enqueue: vi.fn() },
        } as any;
        useRuntimeStore.setState({ runtime, pause, status: "running" } as any);

        renderOverlay(runtime, draft);

        expect(pause).toHaveBeenCalledTimes(1);
        expect(flushCommands).toHaveBeenCalledTimes(1);
    });
});
