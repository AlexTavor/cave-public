// @vitest-environment jsdom
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { IconRegistryProvider } from "../../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { EditorIdContext } from "../../../EditorIdContext";
import { UpdaterAbilityForm } from "./UpdaterAbilityForm";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";

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

describe("UpdaterAbilityForm", () => {
    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders without crashing", () => {
        const moduleData = createCartridge(filename, {
            blueprints: {
                [blueprintId]: createBlueprint(blueprintId, {
                    components: {},
                }),
            },
        });
        useSessionStore.getState().initSession(filename, moduleData);

        const { container } = renderWithProviders(
            <UpdaterAbilityForm
                basePath={`blueprints.${blueprintId}._editor.abilities.updater.0`}
            />,
        );
        expect(container).toBeDefined();
        expect(document.body.textContent).toContain("Triggers");
    });
});

