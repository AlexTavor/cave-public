/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import type { ModuleCartridge } from "../../../../data/schemas/module";
import { useModuleStore } from "../../state/moduleStore";
import { useSessionStore } from "../../state/useSessionStore";
import { useTabGuardStore } from "../../state/tabGuardStore";
import { ASSET_CATEGORY_DISPLAYS } from "../../state/moduleStore.assets";
import { useAssetSession } from "./useAssetSession";
import { DEFAULT_GAME_CONFIG } from "../../../../data/schemas/game/config";
import { DEFAULT_VEIN_CONFIG } from "../../../../data/schemas/assets";
import {
    createCartridge,
    createImpulseConfig,
} from "../../../../engine/test/factories";

const filename = "game_data.json";
const assetId = "wraith";
const sessionId = filename;

const baseModule: ModuleCartridge = createCartridge(filename, {
    metadata: {
        id: filename,
        name: "Test Module",
        version: "0.0.1",
    },
    assets: {
        displays: {
            [assetId]: {
                type: "resource",
                styleId: "spirit",
                glyphKey: "ghost",
            },
        },
        traits: {},
        settings: {
            impulse: createImpulseConfig(),
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

const renderAssetSession = (tabId?: string) => {
    let hookState: ReturnType<typeof useAssetSession> | null = null;

    const TestComponent = () => {
        hookState = useAssetSession({
            filename,
            category: ASSET_CATEGORY_DISPLAYS,
            assetId,
            tabId,
        });
        return null;
    };

    render(<TestComponent />);

    return () => hookState;
};

describe("useAssetSession", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useTabGuardStore.setState({ guards: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        useModuleStore.setState({
            modules: { [filename]: baseModule },
            loading: {},
            loadOrder: [],
            loadModule: vi.fn(async () => {}),
        } as unknown as ReturnType<typeof useModuleStore.getState>);
    });

    it("returns asset draft from module session", () => {
        const getHookState = renderAssetSession();
        const draft = getHookState()?.draft as
            | { type: "resource"; glyphKey: string }
            | undefined;
        if (!draft) {
            throw new Error("Expected resource display draft.");
        }
        expect(draft.glyphKey).toBe("ghost");
    });

    it("updates draft when editing", async () => {
        const getHookState = renderAssetSession();

        act(() => {
            getHookState()?.handleChange((draft) => {
                if (draft.type === "resource") draft.glyphKey = "potion";
            });
        });

        const session = useSessionStore.getState().sessions[sessionId];
        const updated = (session.draft.assets.displays?.[assetId] ?? {}) as {
            glyphKey?: string;
        };
        expect(updated.glyphKey).toBe("potion");
    });

    it("saves and commits draft", async () => {
        const saveModuleCartridge = vi.fn(async () => baseModule);
        useModuleStore.setState({
            saveModuleCartridge,
        } as unknown as ReturnType<typeof useModuleStore.getState>);

        const getHookState = renderAssetSession();

        act(() => {
            getHookState()?.handleChange((draft) => {
                if (draft.type === "resource") draft.glyphKey = "potion";
            });
        });

        await getHookState()?.handleSave();

        expect(saveModuleCartridge).toHaveBeenCalledOnce();
        expect(useSessionStore.getState().sessions[sessionId].isDirty).toBe(
            false,
        );
    });

    it("reports dirty state", async () => {
        const getHookState = renderAssetSession();

        act(() => {
            getHookState()?.handleChange((draft) => {
                if (draft.type === "resource") draft.glyphKey = "potion";
            });
        });

        await waitFor(() => {
            expect(getHookState()?.isDirty).toBe(true);
        });
    });

    it("keeps tab guard callbacks stable while dirty metadata changes", async () => {
        const getHookState = renderAssetSession("asset-tab");

        const initialGuard = useTabGuardStore.getState().getGuard("asset-tab");
        expect(initialGuard).not.toBeNull();

        act(() => {
            getHookState()?.handleChange((draft) => {
                if (draft.type === "resource") draft.glyphKey = "potion";
            });
        });

        await waitFor(() => {
            expect(useTabGuardStore.getState().isDirty("asset-tab")).toBe(true);
        });

        const updatedGuard = useTabGuardStore.getState().getGuard("asset-tab");
        expect(updatedGuard?.requestSave).toBe(initialGuard?.requestSave);
        expect(updatedGuard?.discardChanges).toBe(initialGuard?.discardChanges);
    });
});

