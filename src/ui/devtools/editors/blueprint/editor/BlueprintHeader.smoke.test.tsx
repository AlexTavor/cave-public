// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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

const Harness: React.FC = () => {
    const blueprint = useBlueprintSlice(filename, blueprintId);
    return <BlueprintEditorView isReady blueprint={blueprint} />;
};

const wrap = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <EditorIdContext.Provider value={filename}>
                    <BlueprintProvider value={{ filename, blueprintId }}>
                        <Harness />
                    </BlueprintProvider>
                </EditorIdContext.Provider>
            </PortalManager>
        </ThemeProvider>,
    );

describe("Blueprint header smoke", () => {
    beforeEach(() => {
        const moduleData = createCartridge(filename, {
            blueprints: {
                [blueprintId]: createBlueprint(blueprintId, { components: {} }),
            },
        });
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, moduleData);
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders tags bar and opens change id modal", () => {
        wrap();
        expect(screen.getByPlaceholderText("+ tag")).toBeDefined();
        fireEvent.click(screen.getByText(blueprintId));
        expect(screen.getByText("Change Blueprint ID")).toBeDefined();
    });
});

