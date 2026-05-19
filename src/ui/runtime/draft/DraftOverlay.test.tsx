// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../lib/foundation/icon-registry/IconRegistryProvider";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { DraftOverlay } from "./DraftOverlay";
import { TestWorldInteractionProvider } from "../world/testUtils";

const renderOverlay = (draft: any) => {
    const runtime = {
        getEntity: () => ({ id: "sys_world", draft }),
        commands: { enqueue: vi.fn() },
    } as any;

    return render(
        <ThemeProvider>
            <PortalManager>
                <IconRegistryProvider>
                    <TestWorldInteractionProvider value={{ runtime }}>
                        <DraftOverlay />
                    </TestWorldInteractionProvider>
                </IconRegistryProvider>
            </PortalManager>
        </ThemeProvider>,
    );
};

const makeDraft = (overrides: Record<string, unknown> = {}) => ({
    active: true,
    sourceLabel: "Level Up",
    options: [],
    selectedOptionId: null,
    cycleNumber: 0,
    currentText: "",
    ...overrides,
});

describe("DraftOverlay", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        cleanup();
    });

    it("renders draft options when active", () => {
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
            () => 1,
        );
        vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(
            () => {},
        );

        renderOverlay(
            makeDraft({
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
                        rarity: "rare",
                        icon: "wood",
                    },
                ],
            }),
        );

        expect(screen.getByText("Level Up")).toBeDefined();
        expect(screen.getByText("Option A")).toBeDefined();
        expect(screen.getByText("Option B")).toBeDefined();
    });

    it("hides rarity badge for none", () => {
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
            () => 1,
        );
        vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(
            () => {},
        );

        renderOverlay(
            makeDraft({
                options: [
                    {
                        id: "a",
                        title: "Option A",
                        description: "A",
                        rarity: "none",
                        icon: "wood",
                    },
                ],
            }),
        );

        expect(
            screen.queryByText("Legendary") ?? screen.queryByText("rare"),
        ).toBeNull();
    });

    it("renders current draft text above cards", () => {
        renderOverlay(
            makeDraft({
                cycleNumber: 2,
                currentText: "Forest [b]dreams[/b] back.",
                options: [
                    {
                        id: "a",
                        title: "Option A",
                        description: "A",
                        rarity: "common",
                        icon: "wood",
                    },
                ],
            }),
        );

        expect(screen.getByText("dreams")).toBeDefined();
    });
});

