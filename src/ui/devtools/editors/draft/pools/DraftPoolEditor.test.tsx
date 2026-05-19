// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { DraftPoolEditor } from "./DraftPoolEditor";
import { useSessionStore } from "../../../state/useSessionStore";
import { useModuleStore } from "../../../state/moduleStore";
import { createCartridge } from "../../../../../engine/test/factories";
import type { DraftOptionBlueprint } from "../../../../../data/schemas/draft";
import type { ModuleCartridge } from "../../../../../data/schemas/module";

const filename = "game_data.json";
const poolId = "pool_main";

const optAlpha: DraftOptionBlueprint = {
    id: "opt_alpha",
    title: "Alpha",
    description: "",
    rarity: "none",
    icon: "unknown",
    payload: [],
};

const baseModule: ModuleCartridge = {
    ...createCartridge(filename),
    draftOptions: {
        opt_alpha: optAlpha,
    },
    draftPools: {
        pool_main: {
            id: "pool_main",
            texts: [],
            entries: [{ optionId: "opt_alpha", weight: 2 }],
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
    } as unknown as ReturnType<typeof useModuleStore.getState>);
});

describe("DraftPoolEditor", () => {
    it("renders distribution bar", () => {
        renderEditor();
        expect(screen.getByTitle("opt_alpha — 100%")).toBeDefined();
    });

    it("updates weight via input", () => {
        renderEditor();
        const input = screen.getByDisplayValue("2");
        fireEvent.change(input, { target: { value: "5" } });

        const entries =
            useSessionStore.getState().sessions[filename].draft.draftPools?.[
                poolId
            ]?.entries ?? [];

        expect(entries[0].weight).toBe(5);
    });

    it("renders one-off checkbox from option data", () => {
        renderEditor();
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox.tagName).toBe("INPUT");
        expect((checkbox as HTMLInputElement).checked).toBe(false);
    });

    it("toggles one-off on the draft option", () => {
        renderEditor();
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);

        const opt =
            useSessionStore.getState().sessions[filename].draft.draftOptions?.[
                "opt_alpha"
            ];

        expect(opt?.oneOff).toBe(true);
    });
});

