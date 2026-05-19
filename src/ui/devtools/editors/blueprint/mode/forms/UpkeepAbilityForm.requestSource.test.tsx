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
import { UpkeepAbilityForm } from "./UpkeepAbilityForm";

const filename = "game.json";
const blueprintId = "entity_alpha";
const basePath = `blueprints.${blueprintId}._editor.abilities.upkeep.0`;

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

describe("UpkeepAbilityForm requestSource field", () => {
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
                                failureTrait: "is_cold",
                                autoRequest: true,
                                requestSource: "sys_world",
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

    it("renders request source field", () => {
        wrap(<UpkeepAbilityForm basePath={basePath} />);
        expect(screen.getByText("Request Source")).toBeDefined();
    });

    it("renders all upkeep fields alongside request source", () => {
        wrap(<UpkeepAbilityForm basePath={basePath} />);
        expect(screen.getByText("Resource")).toBeDefined();
        expect(screen.getByText("Rate / Sec")).toBeDefined();
        expect(screen.getByText("Failure Trait")).toBeDefined();
        expect(screen.getByText("Auto-Request")).toBeDefined();
        expect(screen.getByText("Request Source")).toBeDefined();
    });
});
