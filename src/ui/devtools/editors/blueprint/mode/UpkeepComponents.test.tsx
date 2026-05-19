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
import { UpkeepAbilityForm } from "./forms/UpkeepAbilityForm";
import { UpkeepAbilitySection } from "./UpkeepAbilitySection";

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

describe("Upkeep components", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = {
                    abilities: {
                        upkeep: [
                            {
                                resource: "fuel",
                                rate: { base: 1, perBody: 0, multPerBody: 0 },
                                failureTrait: "is_disabled",
                                autoRequest: true,
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

    it("renders upkeep form", () => {
        renderWithProviders(
            <UpkeepAbilityForm
                basePath={`${rootPath}._editor.abilities.upkeep.0`}
            />,
        );
        expect(screen.getByText("Rate / Sec")).toBeDefined();
    });

    it("renders Immediate Transfer toggle", () => {
        renderWithProviders(
            <UpkeepAbilityForm
                basePath={`${rootPath}._editor.abilities.upkeep.0`}
            />,
        );
        expect(screen.getByText("Immediate Transfer")).toBeDefined();
    });

    it("renders upkeep section", () => {
        renderWithProviders(
            <UpkeepAbilitySection
                entries={[
                    {
                        resource: "fuel",
                        rate: { base: 1, perBody: 0, multPerBody: 0 },
                        failureTrait: "is_disabled",
                        autoRequest: true,
                    },
                ]}
                rootPath={rootPath}
                onRemoveItem={() => undefined}
            />,
        );
        expect(screen.getByText("fuel-upkeep")).toBeDefined();
    });
});

