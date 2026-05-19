// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
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
import { BlueprintEditorView } from "./BlueprintEditorView";
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

describe("BlueprintEditor validation", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = {
                    abilities: {
                        cycle: {
                            maxProgress: {
                                base: 10,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            costMultPerCycle: 0,
                            inputs: {},
                            oneOff: false,
                            resourceCosts: [],
                            conditions: [],
                        },
                        conversion: [
                            {
                                id: "conv",
                                inputs: [],
                                outputs: [],
                                resetCycle: true,
                                triggers: ["cycle_complete"],
                                conditions: [],
                            },
                        ],
                    },
                };
            });
        });
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("shows validation hud when abilities have issues", () => {
        renderWithProviders(<EditorHarness />);
        expect(screen.getByText("Validation")).toBeDefined();
    });
});

