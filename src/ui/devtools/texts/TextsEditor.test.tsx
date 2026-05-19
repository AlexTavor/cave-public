// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { useTextsEditorStore } from "./state/useTextsEditorStore";

const mocks = vi.hoisted(() => {
    const modules = {
        "alpha.bp": {
            metadata: { id: "alpha.bp", name: "Alpha", version: "1" },
            assets: {},
            blueprints: {
                forge: {
                    id: "forge",
                    components: {
                        display: { label: "Forge", description: "Heat" },
                    },
                },
            },
        },
    } as any;
    const manifest = vi.fn(async () => ({ files: ["alpha.bp"] }));
    const moduleState = {
        loadModule: vi.fn(async () => undefined),
        getModule: vi.fn((filename: string) => modules[filename] ?? null),
        saveModuleCartridge: vi.fn(async ({ module }: any) => module),
    };
    const sessionState = {
        sessions: {},
        replaceDraft: vi.fn(),
        commitDraft: vi.fn(),
    };
    const shellState = { log: vi.fn(), toggleTextsMode: vi.fn() };
    const toastState = { push: vi.fn() };
    const useModuleStoreMock = Object.assign(
        (selector: any) => selector(moduleState),
        { getState: () => moduleState },
    );
    const useSessionStoreMock = Object.assign(
        (selector: any) => selector(sessionState),
        { getState: () => sessionState },
    );
    return {
        manifest,
        moduleState,
        sessionState,
        shellState,
        toastState,
        useModuleStoreMock,
        useSessionStoreMock,
    };
});

vi.mock("../../../engine/vfs/FileSystem", () => ({
    vfs: { listFiles: vi.fn(async () => []) },
}));
vi.mock("../../../engine/workspace/projectManifest", () => ({
    readProjectManifest: mocks.manifest,
}));
vi.mock("../state/moduleStore", () => ({
    useModuleStore: mocks.useModuleStoreMock,
}));
vi.mock("../state/useSessionStore", () => ({
    useSessionStore: mocks.useSessionStoreMock,
}));
vi.mock("../shell/shell", () => ({
    useShellStore: (selector: any) => selector(mocks.shellState),
}));
vi.mock("../toast/toastStore", () => ({
    useToastStore: (selector: any) => selector(mocks.toastState),
}));

import { TextsEditor } from "./TextsEditor";

describe("TextsEditor", () => {
    beforeEach(() => {
        useTextsEditorStore.getState().discard();
        mocks.manifest.mockResolvedValue({ files: ["alpha.bp"] });
    });

    afterEach(() => {
        cleanup();
    });

    it("renders loading, mirrored headers, filter interaction, and live preview", async () => {
        render(
            <ThemeProvider>
                <TextsEditor manifestPath="project/manifest.json" />
            </ThemeProvider>,
        );
        expect(screen.getByText("Loading texts…")).toBeDefined();
        await waitFor(() =>
            expect(screen.queryByText("Loading texts…")).toBeNull(),
        );
        expect(screen.getAllByText("forge")).toHaveLength(2);
        fireEvent.change(screen.getByDisplayValue("Forge"), {
            target: { value: "Anvil" },
        });
        expect(screen.getByDisplayValue("Anvil")).toBeDefined();
        expect(screen.getAllByText("Anvil")).toHaveLength(2);
        fireEvent.change(screen.getByLabelText("Search"), {
            target: { value: "missing" },
        });
        expect(screen.queryByText("forge")).toBeNull();
    });

    it("renders error state when manifest load fails", async () => {
        mocks.manifest.mockRejectedValueOnce(new Error("boom"));
        render(
            <ThemeProvider>
                <TextsEditor manifestPath="project/manifest.json" />
            </ThemeProvider>,
        );
        await waitFor(() =>
            expect(screen.getAllByText("boom")).toHaveLength(1),
        );
    });
});
