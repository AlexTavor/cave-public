// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { CaveStatusNote } from "./CaveStatusNote";

beforeEach(() => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
});

describe("CaveStatusNote anchor", () => {
    it("hides when runtime is missing", () => {
        render(
            <ThemeProvider>
                <TestWorldInteractionProvider value={{ runtime: null as any }}>
                    <CaveStatusNote />
                </TestWorldInteractionProvider>
            </ThemeProvider>,
        );
        expect(screen.queryByLabelText("Cave status note")).toBeNull();
    });

    it("hides when tutorial attention hides notifications", () => {
        const runtime = {
            getEntity: () => ({
                id: "sys_world",
                state: { food: { value: 2 }, heat: { value: 2 } },
                tutorial: {
                    active: true,
                    attention: { hideNotifications: true },
                },
                cave: {
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
            getWorld: () => ({ entities: [] }),
        };
        render(
            <ThemeProvider>
                <TestWorldInteractionProvider
                    value={{ runtime: runtime as any }}
                >
                    <CaveStatusNote />
                </TestWorldInteractionProvider>
            </ThemeProvider>,
        );
        expect(screen.queryByLabelText("Cave status note")).toBeNull();
    });

    it("renders anchored and unanchored variants", () => {
        const runtime = {
            getEntity: () => ({
                id: "sys_world",
                state: { food: { value: 2 }, heat: { value: 2 } },
                cave: {
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
            getWorld: () => ({ entities: [] }),
        };
        const { rerender, container } = render(
            <ThemeProvider>
                <TestWorldInteractionProvider
                    value={{ runtime: runtime as any }}
                >
                    <CaveStatusNote />
                </TestWorldInteractionProvider>
            </ThemeProvider>,
        );
        expect(
            container.querySelector('[data-anchored="true"]'),
        ).not.toBeNull();
        rerender(
            <ThemeProvider>
                <TestWorldInteractionProvider
                    value={{ runtime: runtime as any }}
                >
                    <CaveStatusNote anchored={false} />
                </TestWorldInteractionProvider>
            </ThemeProvider>,
        );
        expect(
            container.querySelector('[data-anchored="false"]'),
        ).not.toBeNull();
    });
});
