// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
const blueprintId = "bp_form";

const renderForm = () =>
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

describe("ConditionalActivationAbilityForm", () => {
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
                                production: [
                                    {
                                        id: "prod-1",
                                        resource: "wood",
                                        amount: {
                                            base: 1,
                                            perBody: 0,
                                            multPerBody: 0,
                                        },
                                        conditions: [],
                                    },
                                ],
                                storage: [
                                    {
                                        resource: "wood",
                                        displayName: "",
                                        capacity: {
                                            base: 1,
                                            perBody: 0,
                                            multPerBody: 0,
                                        },
                                        entropy: {
                                            base: 0,
                                            perBody: 0,
                                            multPerBody: 0,
                                        },
                                        isDefault: true,
                                        visible: true,
                                        allowDeposit: true,
                                        allowWithdraw: true,
                                        priority: 0,
                                    },
                                ],
                                conditionalActivation: [
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

    it("renders the conditions editor and one checkbox row per authored ability instance", () => {
        act(() => renderForm());
        expect(screen.getByText("Conditions")).toBeDefined();
        expect(screen.getByText("+ Add Condition")).toBeDefined();
        expect(screen.getByText("Cycle")).toBeDefined();
        expect(screen.getByText("wood-production")).toBeDefined();
        expect(screen.getByText("wood-storage")).toBeDefined();
        expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    });
});
