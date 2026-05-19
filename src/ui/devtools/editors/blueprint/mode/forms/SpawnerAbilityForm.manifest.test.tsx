// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { SpawnerAbilityForm } from "./SpawnerAbilityForm";

const workspaceServiceMock = vi.hoisted(() => ({
    activeCartridge: null as any,
}));

vi.mock("../../../../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: workspaceServiceMock,
}));

const filename = "game.json";
const blueprintId = "entity_alpha";
const basePath = `blueprints.${blueprintId}._editor.abilities.spawner.0`;

describe("SpawnerAbilityForm manifest references", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                blueprints: {
                    [blueprintId]: createBlueprint(blueprintId, {
                        components: {},
                    }),
                    egg: createBlueprint("egg"),
                },
            }),
        );
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                draft.blueprints[blueprintId]._editor = {
                    abilities: {
                        spawner: [
                            {
                                blueprintId: "egg",
                                count: { base: 1, perBody: 0, multPerBody: 0 },
                                mode: "spawn_body",
                                target: "sys_world",
                                conditions: [],
                            },
                        ],
                    },
                } as any;
            });
        });
        workspaceServiceMock.activeCartridge = {
            blueprints: {
                egg: { label: "Egg" },
                explore: { label: "Explore" },
            },
        };
    });

    afterEach(() => {
        cleanup();
        workspaceServiceMock.activeCartridge = null;
        useSessionStore.setState({ sessions: {} });
    });

    it("includes manifest-linked targets in blueprint suggestions", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <BlueprintProvider value={{ filename, blueprintId }}>
                        <SpawnerAbilityForm basePath={basePath} />
                    </BlueprintProvider>
                </PortalManager>
            </ThemeProvider>,
        );

        const values = Array.from(document.querySelectorAll("option")).map(
            (option) => option.getAttribute("value"),
        );
        expect(values).toContain("explore");
    });
});
