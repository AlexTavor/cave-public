// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { SessionJsonEditor } from "./SessionJsonEditor";

const updateDraftMock = vi.fn();
let storeData: Record<string, unknown> = {};

vi.mock("../../state/useSessionStore", () => ({
    useSessionStore: (sel: (s: any) => any) =>
        sel({
            sessions: {
                "test.cave": { draft: storeData },
            },
            updateDraft: updateDraftMock,
        }),
}));

afterEach(() => {
    cleanup();
    updateDraftMock.mockClear();
});

const renderEditor = (rootPath: string) =>
    render(
        <ThemeProvider>
            <SessionJsonEditor filename="test.cave" rootPath={rootPath} />
        </ThemeProvider>,
    );

describe("SessionJsonEditor", () => {
    it("renders JSON from the session store sub-path", () => {
        storeData = { config: { settings: { game_config: { a: 1 } } } };
        renderEditor("config.settings.game_config");
        const ta = screen.getByRole("textbox");
        expect(JSON.parse((ta as HTMLTextAreaElement).value)).toEqual({ a: 1 });
    });

    it("shows error on invalid JSON but keeps local text", () => {
        storeData = { simple: {} };
        renderEditor("simple");
        const ta = screen.getByRole("textbox");
        fireEvent.change(ta, { target: { value: "{bad" } });
        expect(screen.getByText("Invalid JSON")).toBeDefined();
        expect((ta as HTMLTextAreaElement).value).toBe("{bad");
    });

    it("calls updateDraft after debounce on valid JSON change", async () => {
        storeData = { cfg: { x: 0 } };
        renderEditor("cfg");
        const ta = screen.getByRole("textbox");
        fireEvent.change(ta, { target: { value: '{"x":5}' } });
        await vi.waitFor(
            () => {
                expect(updateDraftMock).toHaveBeenCalledWith(
                    "test.cave",
                    expect.any(Function),
                );
            },
            { timeout: 1000 },
        );
    });
});

