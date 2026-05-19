// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import {
    createBlueprint,
    createCartridge,
} from "../../../../engine/test/factories";
import { useSessionStore } from "../../state/useSessionStore";
import { StructuredConditionsField } from "./StructuredConditionsField";

const filename = "game.json";
const blueprintId = "entity_alpha";
const path = `blueprints.${blueprintId}._editor.abilities.conditionalActivation.conditions`;

describe("StructuredConditionsField body in pointer", () => {
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
                                    conditions: [],
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

    it("switches a row to body_in_pointer and stores the new kind", () => {
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

        fireEvent.click(screen.getByText("+ Add Condition"));
        fireEvent.change(screen.getByDisplayValue("fact_threshold"), {
            target: { value: "body_in_pointer" },
        });
        const draft = useSessionStore.getState().sessions[filename]
            ?.draft as any;

        expect(
            screen.getByText(
                /sys_pointer currently carries at least one assigned body/i,
            ),
        ).toBeDefined();
        expect(
            draft.blueprints[blueprintId]._editor.abilities
                .conditionalActivation.conditions[0].kind,
        ).toBe("body_in_pointer");
    });
});
