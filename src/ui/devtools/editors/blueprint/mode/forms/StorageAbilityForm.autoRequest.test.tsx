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
import { StorageAbilityForm } from "./StorageAbilityForm";

const filename = "game.json";
const blueprintId = "entity_alpha";
const basePath = `blueprints.${blueprintId}._editor.abilities.storage.0`;

const baseModule = createCartridge(filename, {
    blueprints: {
        [blueprintId]: createBlueprint(blueprintId, { components: {} }),
    },
});

const wrap = (ui: React.ReactElement) =>
    render(
        <ThemeProvider>
            <PortalManager>
                <BlueprintProvider value={{ filename, blueprintId }}>
                    {ui}
                </BlueprintProvider>
            </PortalManager>
        </ThemeProvider>,
    );

describe("StorageAbilityForm autoRequest fields", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor = {
                    abilities: {
                        storage: [
                            {
                                initialValue: 0,
                                resource: "food",
                                capacity: {
                                    base: 100,
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
                                autoRequest: {
                                    enabled: true,
                                    cadence_s: 1,
                                    source: "sys_world",
                                    minRequest: 1,
                                    maxRequest: 50,
                                },
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

    it("renders auto-request fields", () => {
        wrap(<StorageAbilityForm basePath={basePath} />);

        expect(screen.getByText("Auto-Request")).toBeDefined();
        expect(screen.getByText("Cadence (s)")).toBeDefined();
        expect(screen.getByText("Source")).toBeDefined();
        expect(screen.getByText("Min Request")).toBeDefined();
        expect(screen.getByText("Max Request")).toBeDefined();
    });
});

