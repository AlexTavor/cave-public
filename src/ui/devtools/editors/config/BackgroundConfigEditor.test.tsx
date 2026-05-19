// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { BackgroundConfigEditor } from "./BackgroundConfigEditor";

let storeData: Record<string, unknown> = {};

vi.mock("../../state/useSessionStore", () => ({
    useSessionStore: (sel: (s: any) => any) =>
        sel({
            sessions: { "test.art": { draft: storeData } },
            updateDraft: vi.fn(),
        }),
}));

afterEach(() => cleanup());

describe("BackgroundConfigEditor", () => {
    it("renders the assets.settings.background subtree only", () => {
        storeData = {
            config: { settings: { background: { marker: "wrong" } } },
            assets: { settings: { background: { marker: "right" } } },
        };

        render(
            <ThemeProvider>
                <BackgroundConfigEditor filename="test.art" />
            </ThemeProvider>,
        );

        const textbox = screen.getByRole("textbox");
        if (!(textbox instanceof HTMLTextAreaElement)) {
            throw new TypeError(
                "Expected background editor textbox to be a textarea",
            );
        }
        const value = textbox.value;
        expect(value).toContain('"right"');
        expect(value).not.toContain('"wrong"');
    });
});
