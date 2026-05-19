// @vitest-environment jsdom
import React from "react";
import {
    render,
    screen,
    fireEvent,
    cleanup,
    act,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { SpawnerAbilityForm } from "./SpawnerAbilityForm";

const filename = "game.json";
const blueprintId = "entity_alpha";
const basePath = `blueprints.${blueprintId}._editor.abilities.spawner.0`;

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

describe("SpawnerAbilityForm", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = {
                    abilities: {
                        spawner: [
                            {
                                id: "spawner_1",
                                blueprintId: "bp_child",
                                count: { base: 1, perBody: 0, multPerBody: 0 },
                                mode: "spawn_body",
                                target: "sys_world",
                                parentOnSpawn: "none",
                                forcedHabiti: [],
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

    it("renders inputs and toggles target visibility", () => {
        renderWithProviders(<SpawnerAbilityForm basePath={basePath} />);

        expect(screen.getByText("Blueprint")).toBeDefined();
        expect(screen.getByText("Count")).toBeDefined();
        expect(screen.getByText("Mode")).toBeDefined();
        expect(screen.getByText("Target")).toBeDefined();
        expect(screen.getByText("Parent On Spawn")).toBeDefined();
        expect(screen.getByText("Forced Habiti")).toBeDefined();
        expect(screen.getByText("Triggers")).toBeDefined();

        const comboBoxes = screen.getAllByRole("combobox");
        const modeSelect = comboBoxes.find(
            (node) => node.tagName === "SELECT",
        ) as HTMLSelectElement;

        fireEvent.change(modeSelect, { target: { value: "spawn" } });

        expect(screen.queryByText("Target")).toBeNull();
    });
});

