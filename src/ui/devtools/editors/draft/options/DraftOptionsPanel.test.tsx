// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { DraftOptionsPanel } from "./DraftOptionsPanel";
import { useSessionStore } from "../../../state/useSessionStore";
import { useModuleStore } from "../../../state/moduleStore";
import { createCartridge } from "../../../../../engine/test/factories";
import type { DraftOptionBlueprint } from "../../../../../data/schemas/draft";
import type { ModuleCartridge } from "../../../../../data/schemas/module";

const filename = "game_data.json";
const assetFilename = "assets.art";

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
};

const assetModule: ModuleCartridge = {
    ...createCartridge(assetFilename),
    assets: { displays: { worker_icon: { type: "resource" } as any } } as any,
};

const renderPanel = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <DraftOptionsPanel filename={filename} />
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
    useSessionStore.getState().initSession(assetFilename, assetModule);
    useModuleStore.setState({
        modules: { [filename]: baseModule, [assetFilename]: assetModule },
        loading: { [filename]: false },
        getModule: (target: string) =>
            useModuleStore.getState().modules[target] ?? null,
        loadModule: vi.fn(async () => {}),
        createDraftOption: vi.fn(async () => "opt_new"),
        deleteDraftOption: vi.fn(async () => {}),
    } as unknown as ReturnType<typeof useModuleStore.getState>);
});

describe("DraftOptionsPanel", () => {
    it("renders draft options", () => {
        renderPanel();
        expect(screen.getByText("Alpha")).toBeDefined();
    });

    it("creates a draft option", async () => {
        renderPanel();
        const button = screen.getByRole("button", { name: "Create Option" });
        fireEvent.click(button);
        const createDraftOption = useModuleStore.getState().createDraftOption;
        expect(createDraftOption).toHaveBeenCalledOnce();
    });
});

