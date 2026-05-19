// @vitest-environment jsdom
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
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

const filename = "game.json";
const blueprintId = "entity_alpha";

const renderWithProviders = (ui: React.ReactElement) =>
    render(
        <ThemeProvider>
            <PortalManager>
                <IconRegistryProvider>
                    <EditorIdContext.Provider value={filename}>
                        <BlueprintProvider value={{ filename, blueprintId }}>
                            {ui}
                        </BlueprintProvider>
                    </EditorIdContext.Provider>
                </IconRegistryProvider>
            </PortalManager>
        </ThemeProvider>,
    );

const seed = (abilities: Record<string, unknown>) => {
    const moduleData = createCartridge(filename, {
        blueprints: {
            [blueprintId]: createBlueprint(blueprintId, { components: {} }),
        },
    });
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(filename, moduleData);
    act(() => {
        useSessionStore.getState().updateDraft(filename, (draft) => {
            const target = draft.blueprints[blueprintId];
            if (!target) return;
            target._editor = { abilities } as never;
        });
    });
};

describe("Added abilities smoke", () => {
    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders Body ability form", () => {
        seed({
            body: {
                baseAttributes: { body: 1, mind: 1, social: 1 },
                health: 10,
                xp: 0,
                level: 1,
                traits: [],
            },
        });
        const { container } = renderWithProviders(<DesignerMode />);
        expect(container).toBeDefined();
    });

    it("renders Passport ability form", () => {
        seed({
            passport: {
                label: "A",
                icon: "unknown",
                description: "",
                styleId: "",
            },
        });
        const { container } = renderWithProviders(<DesignerMode />);
        expect(container).toBeDefined();
    });

    it("renders WorldPresence ability form", () => {
        seed({
            worldPresence: {
                x: 0,
                y: 0,
                radius: { min: 8, max: 24, valueRef: "", maxRef: "" },
            },
        });
        const { container } = renderWithProviders(<DesignerMode />);
        expect(container).toBeDefined();
    });
});

