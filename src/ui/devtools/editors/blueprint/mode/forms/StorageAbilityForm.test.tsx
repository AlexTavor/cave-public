// @vitest-environment jsdom
import React from "react";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

describe("StorageAbilityForm initial value", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                blueprints: {
                    [blueprintId]: createBlueprint(blueprintId, {
                        components: {},
                    }),
                },
            }),
        );
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                const blueprint = draft.blueprints[blueprintId];
                if (!blueprint) return;
                blueprint._editor = {
                    abilities: {
                        storage: [
                            {
                                resource: "food",
                                initialValue: 0,
                                capacity: {
                                    base: 10,
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
                    },
                };
            });
        });
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders and clamps the initial value field to zero", () => {
        wrap(<StorageAbilityForm basePath={basePath} />);
        const field = screen
            .getByText("Initial Value")
            .closest("div")
            ?.querySelector("input");
        if (!(field instanceof HTMLInputElement))
            throw new Error("Initial Value input missing");
        fireEvent.change(field, { target: { value: "-5" } });
        fireEvent.blur(field);

        expect(field.value).toBe("0");
        const blueprint =
            useSessionStore.getState().sessions[filename]?.draft.blueprints[
                blueprintId
            ];
        expect(blueprint).toBeDefined();
        expect(blueprint?._editor?.abilities?.storage?.[0]?.initialValue).toBe(
            0,
        );
    });
});
