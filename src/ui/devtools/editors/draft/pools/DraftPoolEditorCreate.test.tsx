// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { DraftPoolEditor } from "./DraftPoolEditor";
import { useSessionStore } from "../../../state/useSessionStore";
import { useModuleStore } from "../../../state/moduleStore";
import { createCartridge } from "../../../../../engine/test/factories";
import type { DraftOptionBlueprint } from "../../../../../data/schemas/draft";
import type { ModuleCartridge } from "../../../../../data/schemas/module";

const filename = "test_mod.json";
const poolId = "pool_x";

const makeOpt = (id: string, title: string): DraftOptionBlueprint => ({
    id,
    title,
    description: "",
    rarity: "none",
    icon: "unknown",
    payload: [],
});

const baseModule: ModuleCartridge = {
    ...createCartridge(filename),
    draftOptions: {
        opt_a: makeOpt("opt_a", "Alpha"),
        opt_b: makeOpt("opt_b", "Beta"),
    },
    draftPools: {
        pool_x: {
            id: "pool_x",
            texts: [],
            entries: [{ optionId: "opt_a", weight: 1 }],
        },
    },
};

const renderEditor = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <DraftPoolEditor filename={filename} poolId={poolId} />
            </PortalManager>
        </ThemeProvider>,
    );

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
});

beforeEach(() => {
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(filename, baseModule);
    useModuleStore.setState({
        modules: { [filename]: baseModule },
        loading: { [filename]: false },
        loadModule: vi.fn(async () => {}),
        createDraftOption: vi.fn(async () => "opt_new"),
    } as unknown as ReturnType<typeof useModuleStore.getState>);
});

describe("DraftPoolEditor — create & filter", () => {
    it("renders the Create button", () => {
        renderEditor();
        expect(screen.getByText("Create")).toBeDefined();
    });

    it("renders the Add button", () => {
        renderEditor();
        expect(screen.getByText("Add")).toBeDefined();
    });

    it("renders smoke: shows pool title and entry row", () => {
        renderEditor();
        expect(screen.getByText("Alpha")).toBeDefined();
    });
});

