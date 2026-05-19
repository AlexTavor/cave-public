// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { TriggeredActionsAbilityForm } from "./TriggeredActionsAbilityForm";

const filename = "game.json";
const blueprintId = "cave";
const basePath = `blueprints.${blueprintId}._editor.abilities.triggeredActions.0`;

const renderForm = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <BlueprintProvider value={{ filename, blueprintId }}>
                    <TriggeredActionsAbilityForm basePath={basePath} />
                </BlueprintProvider>
            </PortalManager>
        </ThemeProvider>,
    );

describe("TriggeredActionsAbilityForm", () => {
    afterEach(() => cleanup());

    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                blueprints: {
                    [blueprintId]: createBlueprint(blueprintId, {
                        _editor: {
                            abilities: {
                                triggeredActions: [
                                    {
                                        id: "ta-1",
                                        triggers: ["cycle_complete"],
                                        conditions: [],
                                        actions: [],
                                    },
                                ],
                            },
                        },
                    }),
                },
            }),
        );
    });

    it("renders and stores actions", () => {
        renderForm();
        const input = screen.getByPlaceholderText(/SHOW_CINEMATIC/);
        fireEvent.change(input, {
            target: { value: "KILL_ALL_BODIES_EXCEPT 2" },
        });
        const addButton = screen.getAllByText("Add").at(-1);
        if (!addButton) throw new Error("Add button not found");
        fireEvent.click(addButton);
        const actions =
            useSessionStore.getState().sessions[filename]?.draft.blueprints[
                blueprintId
            ]?._editor?.abilities?.triggeredActions?.[0]?.actions;
        expect(screen.getByText("Triggers")).toBeDefined();
        expect(screen.getByText("Actions")).toBeDefined();
        expect(actions).toEqual([
            { type: "KILL_ALL_BODIES_EXCEPT", quantity: 2 },
        ]);
    });

    it("shows parse errors inline", () => {
        renderForm();
        const input = screen.getAllByPlaceholderText(/SHOW_CINEMATIC/).at(-1);
        if (!input) throw new Error("Input not found");
        fireEvent.change(input, {
            target: { value: "SHOW_CINEMATIC nope" },
        });
        const addButton = screen.getAllByText("Add").at(-1);
        if (!addButton) throw new Error("Add button not found");
        fireEvent.click(addButton);
        expect(
            screen.getByText(
                "SHOW_CINEMATIC must use comma-separated quoted lines.",
            ),
        ).toBeDefined();
    });
});
