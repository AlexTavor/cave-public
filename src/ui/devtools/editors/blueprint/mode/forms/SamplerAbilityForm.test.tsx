// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { SamplerAbilityForm } from "./SamplerAbilityForm";

const filename = "game.json";
const blueprintId = "entity_alpha";
const basePath = `blueprints.${blueprintId}._editor.abilities.sampler.0`;

const baseModule = createCartridge(filename, {
    blueprints: {
        [blueprintId]: createBlueprint(blueprintId, { components: {} }),
        sys_world: createBlueprint("sys_world", { components: {} }),
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

describe("SamplerAbilityForm", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = {
                    abilities: {
                        sampler: [
                            {
                                id: "sampler_1",
                                source: "sys_world.state.notoriety.value",
                                visible: true,
                                target: "sampled_value",
                                max: 100,
                                triggers: ["cycle_complete"],
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

    it("renders source and visible fields only", () => {
        renderWithProviders(<SamplerAbilityForm basePath={basePath} />);

        expect(screen.getByText("Source")).toBeDefined();
        expect(screen.getByText("Visible")).toBeDefined();
        expect(screen.getByText("Triggers")).toBeDefined();
        expect(screen.queryByText("Target")).toBeNull();
        expect(screen.queryByText("Max")).toBeNull();
    });
});

