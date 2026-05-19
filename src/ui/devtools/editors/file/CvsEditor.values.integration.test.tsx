// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CvsEditor } from "./CvsEditor";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";

let state: any = { sessions: {}, updateDraft: vi.fn() };
let moduleSession: any = { isReady: true, draft: null };
let resourceAdapter: any = { getModules: () => [] };

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
    useRuntimeAdapter: () => ({
        getRuntime: () => null,
        getActiveEntityIds: () => [],
        getLoadedBlueprintIds: () => [],
    }),
}));

afterEach(() => {
    resourceAdapter = { getModules: () => [] };
    cleanup();
});

describe("CvsEditor value autocomplete integration", () => {
    it("shows value suggestions for game.spawn from module cartridge", () => {
        state = { sessions: {}, updateDraft: vi.fn() };
        moduleSession = {
            isReady: true,
            draft: { scripts: { "scripts/init.cvs": "game.spawn " } },
        };
        resourceAdapter = {
            getModules: () => [
                { blueprints: { cave_seed: {}, cave_alpha: {} } },
            ],
        };

        render(
            <ThemeProvider>
                <PortalManager>
                    <CvsEditor filename="scripts/init.cvs" />
                </PortalManager>
            </ThemeProvider>,
        );

        const input =
            screen.getByPlaceholderText<HTMLTextAreaElement>(
                "# Enter script...",
            );
        fireEvent.focus(input);
        input.setSelectionRange(11, 11);
        fireEvent.select(input);

        expect(document.querySelector("#portal-floats")?.textContent).toContain(
            "cave_seed",
        );
    });
});
