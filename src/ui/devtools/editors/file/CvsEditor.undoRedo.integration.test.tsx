// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CvsEditor } from "./CvsEditor";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { useShellStore } from "../../shell/shell";

let state: any = { sessions: {}, updateDraft: vi.fn() };
let moduleSession: any = { isReady: true, draft: null };

vi.mock("../../state/moduleSession", () => ({
    useEnsureModuleSession: vi.fn(),
    useModuleSession: () => moduleSession,
}));
vi.mock("../../state/useSessionStore", () => ({
    useSessionStore: (selector: any) => selector(state),
}));
vi.mock("../../terminal/GameResourceAdapter", () => ({
    useGameResourceAdapter: () => ({ getModules: () => [] }),
}));
vi.mock("../../terminal/useRuntimeAdapter", () => ({
    useRuntimeAdapter: () => ({
        getRuntime: () => null,
        getActiveEntityIds: () => [],
        getLoadedBlueprintIds: () => [],
    }),
}));

afterEach(() => {
    useShellStore.setState({ activeModuleFilename: null });
});

describe("CvsEditor undo/redo session integration", () => {
    it("writes script edits to active module session id", () => {
        useShellStore.setState({ activeModuleFilename: "modules/game.json" });
        state = { sessions: {}, updateDraft: vi.fn() };
        moduleSession = {
            isReady: true,
            draft: { scripts: { "scripts/init.cvs": "start" } },
        };

        render(
            <ThemeProvider>
                <PortalManager>
                    <CvsEditor filename="scripts/init.cvs" />
                </PortalManager>
            </ThemeProvider>,
        );

        fireEvent.change(screen.getByPlaceholderText("# Enter script..."), {
            target: { value: "next" },
        });

        expect(state.updateDraft).toHaveBeenCalledWith(
            "modules/game.json",
            expect.any(Function),
        );
    });
});
