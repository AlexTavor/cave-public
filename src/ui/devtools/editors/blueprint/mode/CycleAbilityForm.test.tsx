// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../BlueprintContext";
import { useSessionStore } from "../../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import { CycleAbilityForm } from "./forms/CycleAbilityForm";

const filename = "game.json";
const blueprintId = "entity_alpha";
const rootPath = `blueprints.${blueprintId}`;

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

describe("CycleAbilityForm", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = {
                    abilities: {
                        cycle: {
                            maxProgress: {
                                base: 10,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            costMultPerCycle: 0,
                            inputs: {},
                            transformTo: "missing_blueprint",
                            oneOff: false,
                            resourceCosts: [],
                            conditions: [],
                        },
                    },
                };
            });
        });
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders unknown transform targets safely", () => {
        renderWithProviders(<CycleAbilityForm rootPath={rootPath} />);
        expect(screen.getByText("Unknown (missing_blueprint)")).toBeDefined();
    });

    it("does not render the retired attention toggle", () => {
        renderWithProviders(<CycleAbilityForm rootPath={rootPath} />);
        expect(
            screen.queryByLabelText("Show Attention Until Connected"),
        ).toBeNull();
    });
});

