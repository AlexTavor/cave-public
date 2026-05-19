// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { EjectButton } from "./EjectButton";

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
                <BlueprintProvider value={{ filename, blueprintId }}>
                    {ui}
                </BlueprintProvider>
            </PortalManager>
        </ThemeProvider>,
    );

describe("EjectButton", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("disables eject when blueprint is already raw", () => {
        renderWithProviders(<EjectButton />);
        const button = screen.getByRole("button", { name: "Eject" });
        expect((button as HTMLButtonElement).disabled).toBe(true);
    });
});
