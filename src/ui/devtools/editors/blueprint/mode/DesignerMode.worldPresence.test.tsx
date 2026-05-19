// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../BlueprintContext";
import { useSessionStore } from "../../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import { DesignerMode } from "./DesignerMode";

describe("DesignerMode worldPresence", () => {
    it("adds a schema-valid worldPresence draft", () => {
        // Given
        const filename = "game.json";
        const blueprintId = "entity_alpha";
        useSessionStore.setState({ sessions: {} });
        useSessionStore
            .getState()
            .initSession(
                filename,
                createCartridge(filename, {
                    blueprints: {
                        [blueprintId]: createBlueprint(blueprintId, {
                            components: {},
                        }),
                    },
                }),
            );
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                draft.blueprints[blueprintId]._editor = {
                    abilities: {},
                } as any;
            });
        });

        // When
        render(
            <ThemeProvider>
                <PortalManager>
                    <BlueprintProvider value={{ filename, blueprintId }}>
                        <DesignerMode />
                    </BlueprintProvider>
                </PortalManager>
            </ThemeProvider>,
        );
        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "worldPresence" },
        });
        fireEvent.click(screen.getByText("Add Ability"));
        const presence = useSessionStore.getState().sessions[filename]?.draft
            .blueprints[blueprintId]._editor?.abilities?.worldPresence as any;

        // Then
        expect(presence).toEqual(
            expect.objectContaining({
                x: 0,
                y: 0,
                radius: expect.objectContaining({
                    min: expect.any(Number),
                    max: expect.any(Number),
                }),
            }),
        );
    });
});
