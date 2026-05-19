// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CvsEditor } from "./CvsEditor";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";

let state: any = { sessions: {}, updateDraft: vi.fn() };
let moduleSession: any = { isReady: true, draft: null };
let resourceAdapter: any = { getModules: () => [] };
let runtimeAdapter: any = {
    getRuntime: () => null,
    getActiveEntityIds: () => [],
    getLoadedBlueprintIds: () => [],
};

vi.mock("../../state/moduleSession", () => ({
    useEnsureModuleSession: vi.fn(),
    useModuleSession: () => moduleSession,
}));
vi.mock("../../state/useSessionStore", () => ({
    useSessionStore: (selector: any) => selector(state),
}));
vi.mock("../../terminal/GameResourceAdapter", () => ({
    useGameResourceAdapter: () => resourceAdapter,
}));
vi.mock("../../terminal/useRuntimeAdapter", () => ({
    useRuntimeAdapter: () => runtimeAdapter,
}));

afterEach(() => {
    resourceAdapter = { getModules: () => [] };
    runtimeAdapter = {
        getRuntime: () => null,
        getActiveEntityIds: () => [],
        getLoadedBlueprintIds: () => [],
    };
    cleanup();
});

const renderEditor = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <CvsEditor filename="scripts/init.cvs" />
            </PortalManager>
        </ThemeProvider>,
    );

describe("CvsEditor autocomplete integration", () => {
    it("suggests commands using caret line context in multiline text", () => {
        state = { sessions: {}, updateDraft: vi.fn() };
        moduleSession = {
            isReady: true,
            draft: { scripts: { "scripts/init.cvs": "first\nga\nlast" } },
        };
        renderEditor();

        const input =
            screen.getByPlaceholderText<HTMLTextAreaElement>(
                "# Enter script...",
            );
        fireEvent.focus(input);
        input.setSelectionRange(8, 8);
        fireEvent.select(input);

        expect(document.querySelector("#portal-floats")?.textContent).toContain(
            "game.spawn",
        );
    });

    it("applies autocomplete at caret with tab and updates draft", () => {
        state = { sessions: {}, updateDraft: vi.fn() };
        moduleSession = {
            isReady: true,
            draft: { scripts: { "scripts/init.cvs": "first\nga\nlast" } },
        };
        renderEditor();

        const input =
            screen.getByPlaceholderText<HTMLTextAreaElement>(
                "# Enter script...",
            );
        fireEvent.focus(input);
        input.setSelectionRange(8, 8);
        fireEvent.select(input);
        fireEvent.keyDown(input, { key: "Tab" });

        const recipe = state.updateDraft.mock.calls.at(-1)?.[1];
        const draft = { scripts: {} as Record<string, string> };
        recipe(draft);
        expect(draft.scripts["scripts/init.cvs"]).toContain("game.spawn");
    });

    it("keeps arrow navigation and applies next suggestion with tab", () => {
        state = { sessions: {}, updateDraft: vi.fn() };
        moduleSession = {
            isReady: true,
            draft: { scripts: { "scripts/init.cvs": "ga" } },
        };
        renderEditor();

        const input =
            screen.getByPlaceholderText<HTMLTextAreaElement>(
                "# Enter script...",
            );
        fireEvent.focus(input);
        input.setSelectionRange(2, 2);
        fireEvent.select(input);
        fireEvent.keyDown(input, { key: "ArrowDown" });
        fireEvent.keyUp(input, { key: "ArrowDown" });
        fireEvent.keyDown(input, { key: "Tab" });

        const recipe = state.updateDraft.mock.calls.at(-1)?.[1];
        const draft = { scripts: {} as Record<string, string> };
        recipe(draft);
        expect(draft.scripts["scripts/init.cvs"]).toContain("game.reset");
    });
});
