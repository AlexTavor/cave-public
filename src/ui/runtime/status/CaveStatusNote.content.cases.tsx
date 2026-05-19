// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { CaveStatusNote } from "./CaveStatusNote";

const wrap = (runtime: any) =>
    render(
        <ThemeProvider>
            <TestWorldInteractionProvider value={{ runtime }}>
                <CaveStatusNote />
            </TestWorldInteractionProvider>
        </ThemeProvider>,
    );

beforeEach(() => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
});

describe("CaveStatusNote content", () => {
    it("renders combined statuses with colored keywords", () => {
        const runtime: any = {
            getEntity: () => ({
                id: "sys_world",
                state: { food: { value: 0 }, heat: { value: 0 } },
                cave: {
                    mind: {
                        emotions: {
                            happiness: 0.1,
                            sadness: 0.2,
                            terror: 0.7,
                            curiosity: 0.3,
                            worry: 0,
                        },
                    },
                },
            }),
            getWorld: () => ({ entities: [] }),
        };
        const view = wrap(runtime);
        expect(
            screen.getByText("hungry").closest("[data-anchored]")?.textContent,
        ).toBe("Cave is hungry, cold, and scared");
        expect(screen.getByText("hungry").getAttribute("style")).toContain(
            "color",
        );
        expect(screen.getByText("cold").getAttribute("style")).toContain(
            "color",
        );
        expect(screen.getByText("scared").getAttribute("style")).toContain(
            "color",
        );
        view.rerender(
            <ThemeProvider>
                <TestWorldInteractionProvider value={{ runtime }}>
                    <CaveStatusNote />
                </TestWorldInteractionProvider>
            </ThemeProvider>,
        );
        expect(screen.getByLabelText("Cave status note").textContent).toBe(
            "Cave is hungry, cold, and scared",
        );
    });

    it("renders only the emotional status when resources are stable", () => {
        wrap({
            getEntity: () => ({
                id: "sys_world",
                state: { food: { value: 2 }, heat: { value: 3 } },
                cave: {
                    mind: {
                        emotions: {
                            happiness: 0.6,
                            sadness: 0.1,
                            terror: 0.2,
                            curiosity: 0.4,
                            worry: 0,
                        },
                    },
                },
            }),
            getWorld: () => ({ entities: [] }),
        } as any);
        expect(
            screen.getByText("happy").closest("[data-anchored]")?.textContent,
        ).toBe("Cave is happy");
    });

    it("renders worried with the status color treatment", () => {
        wrap({
            getEntity: () => ({
                id: "sys_world",
                state: { food: { value: 2 }, heat: { value: 2 } },
                cave: {
                    mind: {
                        emotions: {
                            happiness: 0.1,
                            sadness: 0.2,
                            terror: 0.1,
                            curiosity: 0.2,
                            worry: 0.6,
                        },
                    },
                },
            }),
            getWorld: () => ({ entities: [] }),
        } as any);
        expect(screen.getByText("worried").getAttribute("style")).toContain(
            "color",
        );
        expect(screen.getByLabelText("Cave status note").textContent).toBe(
            "Cave is worried",
        );
    });
});
