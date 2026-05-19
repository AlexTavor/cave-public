// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { DraftAbilityForm } from "./DraftAbilityForm";

const filename = "game.json";
const blueprintId = "cave";
const basePath = `blueprints.${blueprintId}._editor.abilities.draft.0`;

const renderForm = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <BlueprintProvider value={{ filename, blueprintId }}>
                    <DraftAbilityForm basePath={basePath} />
                </BlueprintProvider>
            </PortalManager>
        </ThemeProvider>,
    );

describe("DraftAbilityForm", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                blueprints: {
                    [blueprintId]: createBlueprint(blueprintId, {
                        _editor: {
                            abilities: {
                                draft: [
                                    {
                                        poolId: "pool",
                                        count: 3,
                                        label: "Draft",
                                        conditions: [],
                                        onComplete: [],
                                    },
                                ],
                            },
                        },
                    }),
                },
            }),
        );
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders and stores onComplete actions", () => {
        renderForm();
        const input = screen.getAllByPlaceholderText(/SHOW_CINEMATIC/).at(-1);
        if (!input) throw new Error("Input not found");

        fireEvent.change(input, { target: { value: 'SHOW_CINEMATIC "Done"' } });

        const addButton = screen.getAllByText("Add").at(-1);
        if (!addButton) throw new Error("Add button not found");

        fireEvent.click(addButton);

        const actions =
            useSessionStore.getState().sessions[filename]?.draft.blueprints[
                blueprintId
            ]?._editor?.abilities?.draft?.[0]?.onComplete;
        expect(screen.getByText("Triggers")).toBeDefined();
        expect(screen.getByText("On Complete")).toBeDefined();
        expect(actions).toEqual([{ type: "SHOW_CINEMATIC", lines: ["Done"] }]);
    });

    it("shows parse errors inline", () => {
        renderForm();
        const input = screen.getAllByPlaceholderText(/SHOW_CINEMATIC/).at(-1);
        if (!input) throw new Error("Input not found");
        fireEvent.change(input, { target: { value: "SHOW_CINEMATIC nope" } });
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
