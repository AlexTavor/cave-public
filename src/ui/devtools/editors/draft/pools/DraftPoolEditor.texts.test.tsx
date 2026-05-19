// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { createCartridge } from "../../../../../engine/test/factories";
import { useModuleStore } from "../../../state/moduleStore";
import { useSessionStore } from "../../../state/useSessionStore";
import { DraftPoolEditor } from "./DraftPoolEditor";

const filename = "game_data.json";
const poolId = "pool_main";
const moduleData = {
    ...createCartridge(filename),
    draftOptions: {},
    draftPools: { [poolId]: { id: poolId, texts: [], entries: [] } },
};

const renderEditor = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <DraftPoolEditor filename={filename} poolId={poolId} />
            </PortalManager>
        </ThemeProvider>,
    );

beforeEach(() => {
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(filename, moduleData as any);
    useModuleStore.setState({
        modules: { [filename]: moduleData },
        loading: { [filename]: false },
        loadModule: vi.fn(async () => {}),
    } as any);
});

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
});

describe("DraftPoolEditor texts", () => {
    it("adds, edits, and removes draft texts", () => {
        renderEditor();
        fireEvent.click(screen.getByText("Add Text"));
        const textarea = screen
            .getAllByRole("textbox")
            .find((element) => element.tagName === "TEXTAREA");
        if (!(textarea instanceof HTMLTextAreaElement)) {
            throw new TypeError("Expected textarea");
        }
        fireEvent.change(textarea, {
            target: { value: "First line\nSecond line" },
        });
        fireEvent.blur(textarea);
        expect(screen.getByText("First line")).toBeDefined();
        expect(
            useSessionStore.getState().sessions[filename].draft.draftPools?.[
                poolId
            ]?.texts,
        ).toEqual(["First line\nSecond line"]);
        fireEvent.click(screen.getByText("Remove"));
        expect(screen.getByText("No draft texts yet.")).toBeDefined();
    });

    it("renumbers visible text labels after removal", () => {
        useSessionStore.getState().updateDraft(filename, (draft) => {
            const pool = draft.draftPools?.[poolId];
            if (pool) pool.texts = ["One", "Two"];
        });
        renderEditor();
        expect(screen.getByText("Text #1")).toBeDefined();
        expect(screen.getByText("Text #2")).toBeDefined();
        fireEvent.click(screen.getAllByText("Remove")[0]);
        expect(screen.getByText("Text #1")).toBeDefined();
        expect(screen.queryByText("Text #2")).toBeNull();
    });
});
