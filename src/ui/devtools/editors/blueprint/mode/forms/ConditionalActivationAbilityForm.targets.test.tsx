// @vitest-environment jsdom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getByPath } from "../../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { ConditionalActivationAbilityForm } from "./ConditionalActivationAbilityForm";

const filename = "game.json";
const blueprintId = "bp_form_targets";

describe("ConditionalActivationAbilityForm targets", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                blueprints: {
                    [blueprintId]: createBlueprint(blueprintId, {
                        _editor: {
                            abilities: {
                                cycle: {
                                    maxProgress: {
                                        base: 1,
                                        perBody: 0,
                                        multPerBody: 0,
                                    },
                                    costMultPerCycle: 0,
                                    inputs: {},
                                    oneOff: false,
                                    conditions: [],
                                },
                                conditionalActivation: [
                                    {
                                        priority: 0,
                                        conditions: [],
                                        targets: [],
                                    },
                                    {
                                        priority: 0,
                                        conditions: [],
                                        targets: [],
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

    it("updates only the addressed entry when toggling targets", () => {
        act(() => {
            render(
                <ThemeProvider>
                    <PortalManager>
                        <BlueprintProvider value={{ filename, blueprintId }}>
                            <ConditionalActivationAbilityForm
                                basePath={`blueprints.${blueprintId}._editor.abilities.conditionalActivation.0`}
                            />
                        </BlueprintProvider>
                    </PortalManager>
                </ThemeProvider>,
            );
        });
        fireEvent.click(screen.getByLabelText("Cycle"));
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                `blueprints.${blueprintId}._editor.abilities.conditionalActivation.0.targets`,
            ),
        ).toEqual([{ ability: "cycle" }]);
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                `blueprints.${blueprintId}._editor.abilities.conditionalActivation.1.targets`,
            ),
        ).toEqual([]);
    });
});
