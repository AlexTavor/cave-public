// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { BlueprintFileEditor } from "./BlueprintFileEditor";
import { CvsEditor } from "./CvsEditor";
import { AssetPackEditor } from "./AssetPackEditor";
import { SystemConfigEditor } from "./SystemConfigEditor";
import { DraftPackEditor } from "./DraftPackEditor";

let state: any = { sessions: {}, updateDraft: vi.fn() };
let moduleSession: any = { isReady: true, draft: null };

const openFileMock = vi.fn();
vi.mock("../../shell/shell", () => ({
    useShellStore: (sel: any) => sel({ openFile: openFileMock }),
}));
vi.mock("../../state/moduleSession", () => ({
    useEnsureModuleSession: vi.fn(),
    useModuleSession: () => moduleSession,
}));
vi.mock("../../state/useSessionStore", () => ({
    useSessionStore: (selector: any) => selector(state),
}));
vi.mock("../blueprint/editor/BlueprintEditor", () => ({
    BlueprintEditor: ({ blueprintId }: any) => <div>{blueprintId}</div>,
}));
vi.mock("../draft/DraftPackEditor", () => ({
    DraftPackEditor: () => <div>draft-dashboard</div>,
}));

const wrap = (ui: React.ReactElement) =>
    render(<ThemeProvider>{ui}</ThemeProvider>);

describe("file editor roots", () => {
    it("mounts BlueprintFileEditor with existing blueprint", () => {
        moduleSession = {
            isReady: true,
            draft: { blueprints: { actor: { id: "actor" } } },
        };
        render(<BlueprintFileEditor filename="modules/actors.bp" />);
        expect(screen.getByText("actor")).toBeDefined();
    });

    it("binds CvsEditor input to session update", () => {
        state = { sessions: {}, updateDraft: vi.fn() };
        moduleSession = {
            isReady: true,
            draft: { scripts: { "scripts/init.cvs": "HELLO" } },
        };
        render(<CvsEditor filename="scripts/init.cvs" />);
        expect(screen.getByDisplayValue("HELLO")).toBeDefined();
        fireEvent.change(screen.getByPlaceholderText("# Enter script..."), {
            target: { value: "WORLD" },
        });
        expect(state.updateDraft).toHaveBeenCalledWith(
            "scripts/init.cvs",
            expect.any(Function),
        );
        const recipe = state.updateDraft.mock.calls[0][1];
        const draft = { scripts: {} as Record<string, string> };
        recipe(draft);
        expect(draft.scripts["scripts/init.cvs"]).toBe("WORLD");
    });

    it("renders dashboard cards for .cave and .art files", () => {
        wrap(
            <>
                <AssetPackEditor filename="modules/assets.art" />
                <SystemConfigEditor filename="modules/core.cave" />
                <DraftPackEditor filename="modules/progression.draft" />
            </>,
        );
        expect(screen.getByText("Displays")).toBeDefined();
        expect(screen.getByText("Impulse Physics")).toBeDefined();
        expect(screen.getByText("draft-dashboard")).toBeDefined();
    });
});

