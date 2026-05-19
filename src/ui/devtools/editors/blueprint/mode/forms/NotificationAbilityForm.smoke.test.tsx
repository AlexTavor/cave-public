// @vitest-environment jsdom
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { IconRegistryProvider } from "../../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { EditorIdContext } from "../../../EditorIdContext";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { DesignerMode } from "../DesignerMode";

const filename = "game.json";
const blueprintId = "entity_notif";

const withProviders = (ui: React.ReactElement) => (
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
    </ThemeProvider>
);

const renderWithProviders = (ui: React.ReactElement) =>
    render(withProviders(ui));

const seed = () => {
    const moduleData = createCartridge(filename, {
        blueprints: {
            [blueprintId]: createBlueprint(blueprintId, {
                components: {},
            }),
        },
    });
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(filename, moduleData);
    act(() => {
        useSessionStore.getState().updateDraft(filename, (draft) => {
            const target = draft.blueprints[blueprintId];
            if (!target) return;
            target._editor = {
                abilities: {
                    notifications: [
                        {
                            id: "n1",
                            title: "Greeting",
                            text: "Hello",
                            imageUrl: null,
                        },
                    ],
                },
            } as never;
        });
    });
};

describe("NotificationAbilityForm smoke", () => {
    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders notification ability form without crashing", () => {
        seed();
        const { container } = renderWithProviders(<DesignerMode />);
        expect(container).toBeDefined();
    });

    it("renders stably on re-render", () => {
        seed();
        const { container, rerender } = renderWithProviders(<DesignerMode />);
        rerender(withProviders(<DesignerMode />));
        expect(container).toBeDefined();
    });
});

