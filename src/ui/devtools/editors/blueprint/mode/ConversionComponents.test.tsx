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
import { ConversionAbilityForm } from "./forms/ConversionAbilityForm";
import { ConversionItemsSection } from "./forms/ConversionItemsSection";
import { ConversionAbilitySection } from "./ConversionAbilitySection";

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

describe("Conversion components", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = {
                    abilities: {
                        conversion: [
                            {
                                id: "conv",
                                inputs: [],
                                outputs: [],
                                resetCycle: true,
                                triggers: ["cycle_complete"],
                                conditions: [],
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

    it("renders conversion form", () => {
        renderWithProviders(
            <ConversionAbilityForm
                basePath={`${rootPath}._editor.abilities.conversion.0`}
            />,
        );
        expect(screen.getByText("Reset Cycle")).toBeDefined();
    });

    it("renders conversion items", () => {
        renderWithProviders(
            <ConversionItemsSection
                label="Input"
                filename={filename}
                basePath={`${rootPath}._editor.abilities.conversion.0.inputs`}
                items={[
                    {
                        resource: "",
                        amount: { base: 0, perBody: 0, multPerBody: 0 },
                    },
                ]}
                resourceKeys={[]}
                onAdd={() => undefined}
                onRemove={() => undefined}
            />,
        );
        expect(screen.getByText("Add Input")).toBeDefined();
    });

    it("renders conversion section", () => {
        renderWithProviders(
            <ConversionAbilitySection
                entries={[
                    {
                        id: "conv",
                        inputs: [],
                        outputs: [],
                        resetCycle: true,
                        triggers: ["cycle_complete"],
                        conditions: [],
                    },
                ]}
                rootPath={rootPath}
                onRemoveItem={() => undefined}
            />,
        );
        expect(screen.getByText("Conversion 1")).toBeDefined();
    });
});

