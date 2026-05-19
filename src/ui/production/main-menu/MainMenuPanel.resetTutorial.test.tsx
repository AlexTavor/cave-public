// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { useRuntimeStore } from "../../runtime/state/useRuntimeStore";
import { MainMenuPanel } from "./MainMenuPanel";

afterEach(() => {
    cleanup();
    globalThis.localStorage?.clear();
    useRuntimeStore.setState({ runtime: null, status: "idle" } as any);
});

describe("MainMenuPanel reset tutorial", () => {
    it("disables reset tutorial when no runtime or stored memory exists", () => {
        render(
            <ThemeProvider>
                <MainMenuPanel
                    actions={[]}
                    errorText={null}
                    statusText="Ready"
                    subtitle="Sub"
                    title="Title"
                />
            </ThemeProvider>,
        );
        expect(
            screen
                .getByRole("button", { name: /RESET TUTORIAL/ })
                .hasAttribute("disabled"),
        ).toBe(true);
    });

    it("clears the active tutorial through the runtime command queue", () => {
        const enqueue = vi.fn();
        const flushCommands = vi.fn();
        useRuntimeStore.setState({
            runtime: {
                commands: { enqueue },
                flushCommands,
                getEntity: () => ({
                    permanent: {
                        tutorial_completed: { intro: 2, draft_tut: 1 },
                    },
                }),
                getState: () => ({ status: "paused" }),
            } as any,
            status: "paused",
        } as any);

        render(
            <ThemeProvider>
                <MainMenuPanel
                    actions={[]}
                    errorText={null}
                    statusText="Ready"
                    subtitle="Sub"
                    title="Title"
                />
            </ThemeProvider>,
        );
        const button = screen.getByRole("button", { name: /RESET TUTORIAL/ });
        fireEvent.click(button);
        expect(button.hasAttribute("disabled")).toBe(true);
        expect(enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "permanent",
                factType: "tutorial_completed",
                factAbout: "intro",
                delta: -2,
            },
        });
        expect(enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "permanent",
                factType: "tutorial_completed",
                factAbout: "draft_tut",
                delta: -1,
            },
        });
        expect(enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.SET_TUTORIAL_STATE,
            payload: { tutorial: null },
        });
        expect(flushCommands).toHaveBeenCalled();
    });

    it("disables reset tutorial when runtime has nothing to reset", () => {
        useRuntimeStore.setState({
            runtime: {
                getEntity: () => ({
                    permanent: { tutorial_completed: {} },
                    tutorial: null,
                }),
            } as any,
        } as any);

        render(
            <ThemeProvider>
                <MainMenuPanel
                    actions={[]}
                    errorText={null}
                    statusText="Ready"
                    subtitle="Sub"
                    title="Title"
                />
            </ThemeProvider>,
        );

        expect(
            screen
                .getByRole("button", { name: /RESET TUTORIAL/ })
                .hasAttribute("disabled"),
        ).toBe(true);
    });
});
