// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { useRuntimeStore } from "../../runtime/state/useRuntimeStore";
import { persistTutorialCompletionMemory } from "../../runtime/tutorials/tutorialCompletionMemory";
import { persistTutorialMode } from "../../runtime/tutorials/tutorialModeMemory";
import { MainMenuPanel } from "./MainMenuPanel";

afterEach(() => {
    cleanup();
    globalThis.localStorage?.clear();
    useRuntimeStore.setState({ runtime: null, status: "idle" } as any);
});

describe("MainMenuPanel reset tutorial storage", () => {
    it("enables reset tutorial from stored memory on cold reload", () => {
        persistTutorialCompletionMemory({ intro: 1 });

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
        expect(button.hasAttribute("disabled")).toBe(false);
        fireEvent.click(button);
        expect(button.hasAttribute("disabled")).toBe(true);
    });

    it("enables reset tutorial when stored tutorial mode is off", () => {
        persistTutorialMode(0);
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
        ).toBe(false);
    });
});
