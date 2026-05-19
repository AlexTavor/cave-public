// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import { BlueprintProvider } from "../BlueprintContext";
import { useSessionStore } from "../../../state/useSessionStore";
import { createCycleAbilityDraft } from "./abilityDrafts";
import { CycleAbilityForm } from "./forms/CycleAbilityForm";

const workspaceServiceMock = vi.hoisted(() => ({
    activeCartridge: null as any,
}));

vi.mock("../../../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: workspaceServiceMock,
}));

const filename = "game.json";
const blueprintId = "entity_alpha";
const rootPath = `blueprints.${blueprintId}`;

const renderForm = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <BlueprintProvider value={{ filename, blueprintId }}>
                    <CycleAbilityForm rootPath={rootPath} />
                </BlueprintProvider>
            </PortalManager>
        </ThemeProvider>,
    );

describe("CycleAbilityForm cross-file references", () => {
    beforeEach(() => {
        workspaceServiceMock.activeCartridge = {
            blueprints: { explore: { label: "Explore" } },
        };
        useSessionStore.setState({ sessions: {} });
        useSessionStore
            .getState()
            .initSession(
                filename,
                createCartridge(filename, {
                    blueprints: {
                        [blueprintId]: createBlueprint(blueprintId, {
                            components: {},
                        }),
                    },
                }),
            );
    });

    afterEach(() => {
        cleanup();
        workspaceServiceMock.activeCartridge = null;
        useSessionStore.setState({ sessions: {} });
    });

    it("renders manifest-linked lifecycle targets as normal options", () => {
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                draft.blueprints[blueprintId]._editor = {
                    abilities: {
                        cycle: {
                            ...createCycleAbilityDraft(),
                            transformTo: "explore",
                        },
                    },
                } as any;
            });
        });
        renderForm();

        expect(screen.getByRole("option", { name: "Explore" })).toBeDefined();
        expect(screen.queryByText("Unknown (explore)")).toBeNull();
    });

    it("defaults show throttle slider to checked for new drafts", () => {
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                draft.blueprints[blueprintId]._editor = {
                    abilities: { cycle: createCycleAbilityDraft() },
                } as any;
            });
        });
        renderForm();

        expect(screen.getByLabelText("Show Throttle Slider")).toHaveProperty(
            "checked",
            true,
        );
    });
});
