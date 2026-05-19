// @vitest-environment jsdom
import React from "react";
import {
    render,
    fireEvent,
    screen,
    cleanup,
    act,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../BlueprintContext";
import { useSessionStore } from "../../../state/useSessionStore";
import { EditorIdContext } from "../../EditorIdContext";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import { DesignerMode } from "./DesignerMode";
import { BlueprintEditorView } from "../editor/BlueprintEditorView";
import { useBlueprintSlice } from "../../../state/moduleSession/useBlueprintSlice";

vi.mock("../visuals/BlueprintVisualsModal", () => ({
    BlueprintVisualsModal: () => null,
}));

const filename = "game.json";
const blueprintId = "entity_alpha";
const baseModule = createCartridge(filename, {
    blueprints: {
        [blueprintId]: createBlueprint(blueprintId, { components: {} }),
    },
});

const renderWithProviders = (ui: React.ReactElement) =>
    render(
        <ThemeProvider>
            <PortalManager>
                <EditorIdContext.Provider value={filename}>
                    <BlueprintProvider value={{ filename, blueprintId }}>
                        {ui}
                    </BlueprintProvider>
                </EditorIdContext.Provider>
            </PortalManager>
        </ThemeProvider>,
    );

const EditorHarness: React.FC = () => {
    const blueprint = useBlueprintSlice(filename, blueprintId);
    return <BlueprintEditorView isReady blueprint={blueprint} />;
};

describe("DesignerMode", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        globalThis.localStorage?.removeItem(`cave.moduleDraft:${filename}`);
        useSessionStore.getState().initSession(filename, baseModule);
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("shows abilities tab by default and remains visible after _editor init", () => {
        renderWithProviders(<EditorHarness />);

        expect(screen.getByText("Add Ability")).toBeDefined();

        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = { abilities: {} };
            });
        });

        expect(screen.getByText("Add Ability")).toBeDefined();
    });

    it("updates max progress base on change", () => {
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = {
                    abilities: {
                        cycle: {
                            maxProgress: {
                                base: 100,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            costMultPerCycle: 0,
                            inputs: {},
                            oneOff: false,
                            resourceCosts: [],
                            conditions: [],
                        },
                    },
                };
            });
        });

        renderWithProviders(<DesignerMode />);

        const baseInput = screen.getAllByRole("spinbutton")[0];
        fireEvent.change(baseInput, { target: { value: "200" } });
        fireEvent.blur(baseInput);

        const updated =
            useSessionStore.getState().sessions[filename].draft.blueprints[
                blueprintId
            ]._editor?.abilities?.cycle?.maxProgress.base;

        expect(updated).toBe(200);
    });
});

