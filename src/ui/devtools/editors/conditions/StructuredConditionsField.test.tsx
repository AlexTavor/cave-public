// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { useSessionStore } from "../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../engine/test/factories";
import { StructuredConditionsField } from "./StructuredConditionsField";

const filename = "game.json";
const blueprintId = "entity_alpha";
const path = `blueprints.${blueprintId}._editor.abilities.conditionalActivation.conditions`;

describe("StructuredConditionsField", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                blueprints: {
                    [blueprintId]: createBlueprint(blueprintId, {
                        components: {},
                        _editor: {
                            abilities: {
                                conditionalActivation: {
                                    conditions: [
                                        {
                                            kind: "fact_threshold",
                                            scope: "run",
                                            factType: "elapsed_real_seconds",
                                            factAbout: "world",
                                            operator: ">=",
                                            value: 1,
                                        },
                                    ],
                                    targets: [],
                                },
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

    it("renders, adds, switches, and removes structured condition rows", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <StructuredConditionsField
                        filename={filename}
                        path={path}
                    />
                </PortalManager>
            </ThemeProvider>,
        );
        expect(screen.getAllByText("Kind")).toHaveLength(1);
        expect(screen.getByText("Fact Type")).toBeDefined();
        fireEvent.click(screen.getByText("+ Add Condition"));
        expect(
            (
                useSessionStore.getState().sessions[filename]?.draft.blueprints[
                    blueprintId
                ] as any
            )?._editor.abilities.conditionalActivation.conditions,
        ).toHaveLength(2);
        fireEvent.change(screen.getAllByDisplayValue("fact_threshold")[1], {
            target: { value: "user_interaction" },
        });
        expect(screen.getByText("Interaction")).toBeDefined();
        fireEvent.change(screen.getByDisplayValue("self_selected"), {
            target: { value: "self_unselected" },
        });
        expect(
            (
                useSessionStore.getState().sessions[filename]?.draft.blueprints[
                    blueprintId
                ] as any
            )?._editor.abilities.conditionalActivation.conditions[1],
        ).toMatchObject({
            kind: "user_interaction",
            interaction: "self_unselected",
        });
        fireEvent.click(screen.getAllByText("Remove Condition")[1]);
        expect(
            (
                useSessionStore.getState().sessions[filename]?.draft.blueprints[
                    blueprintId
                ] as any
            )?._editor.abilities.conditionalActivation.conditions,
        ).toHaveLength(1);
    });
});
