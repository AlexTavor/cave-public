// @vitest-environment jsdom
import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../BlueprintContext";
import { useSessionStore } from "../../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import { DesignerMode } from "./DesignerMode";

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

describe("DesignerMode assignment", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = { abilities: {} };
            });
        });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        useSessionStore.setState({ sessions: {} });
    });

    it("adds assignment ability without crashing", () => {
        renderWithProviders(<DesignerMode />);

        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "assignment" },
        });
        fireEvent.click(screen.getByText("Add Ability"));
        act(() => {
            vi.runOnlyPendingTimers();
        });

        expect(screen.getByText("Slots")).toBeDefined();
        expect(screen.getByText("+ Add Filter")).toBeDefined();
        expect(screen.getByText("+ Add Minimum")).toBeDefined();
    });
});

