// @vitest-environment jsdom
import React from "react";
import {
    render,
    screen,
    fireEvent,
    cleanup,
    act,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../blueprint/BlueprintContext";
import { useSessionStore } from "../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../engine/test/factories";
import { ConditionsField } from "./ConditionsField";

const filename = "game.json";
const blueprintId = "entity_alpha";
const basePath = `blueprints.${blueprintId}._editor.abilities.production.0.conditions`;

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

describe("ConditionsField", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = {
                    abilities: {
                        production: [
                            {
                                id: "prod_1",
                                resource: "wood",
                                amount: { base: 1, perBody: 0, multPerBody: 0 },
                                triggers: ["cycle_complete"],
                                conditions: ["self.state.a > 1"],
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

    it("renders and edits condition rows", () => {
        renderWithProviders(
            <ConditionsField filename={filename} path={basePath} />,
        );

        expect(screen.getByDisplayValue("self.state.a > 1")).toBeDefined();

        fireEvent.click(screen.getByText("Add Condition"));
        const conditions =
            useSessionStore.getState().sessions[filename]?.draft.blueprints[
                blueprintId
            ]?._editor?.abilities?.production?.[0]?.conditions ?? [];
        expect(conditions).toEqual(["self.state.a > 1", ""]);

        const inputs = screen.getAllByPlaceholderText("self.state.foo > 5");
        fireEvent.change(inputs[1], { target: { value: "self.state.b > 2" } });

        const updated =
            useSessionStore.getState().sessions[filename]?.draft.blueprints[
                blueprintId
            ]?._editor?.abilities?.production?.[0]?.conditions ?? [];
        expect(updated).toEqual(["self.state.a > 1", "self.state.b > 2"]);
    });
});

