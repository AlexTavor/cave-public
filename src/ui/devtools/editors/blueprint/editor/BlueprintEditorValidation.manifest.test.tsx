// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import { EditorIdContext } from "../../EditorIdContext";
import { BlueprintProvider } from "../BlueprintContext";
import { useSessionStore } from "../../../state/useSessionStore";
import { useBlueprintSlice } from "../../../state/moduleSession/useBlueprintSlice";
import { BlueprintEditorView } from "./BlueprintEditorView";

vi.mock("../visuals/BlueprintVisualsModal", () => ({
    BlueprintVisualsModal: () => null,
}));

const workspaceServiceMock = vi.hoisted(() => ({
    activeCartridge: null as any,
}));

vi.mock("../../../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: workspaceServiceMock,
}));

const filename = "game.json";
const blueprintId = "entity_alpha";

const Harness = () => {
    const blueprint = useBlueprintSlice(filename, blueprintId);
    return <BlueprintEditorView isReady blueprint={blueprint} />;
};

describe("BlueprintEditor validation manifest references", () => {
    beforeEach(() => {
        workspaceServiceMock.activeCartridge = {
            blueprints: { explore: { label: "Explore" } },
        };
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
                draft.blueprints[blueprintId]._editor = {
                    abilities: {
                        cycle: {
                            maxProgress: {
                                base: 10,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            costMultPerCycle: 0,
                            inputs: {},
                            oneOff: false,
                            conditions: [],
                        },
                        spawner: [
                            {
                                blueprintId: "explore",
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
    });

    afterEach(() => {
        cleanup();
        workspaceServiceMock.activeCartridge = null;
        useSessionStore.setState({ sessions: {} });
    });

    it("accepts manifest-linked spawner targets", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <EditorIdContext.Provider value={filename}>
                        <BlueprintProvider value={{ filename, blueprintId }}>
                            <Harness />
                        </BlueprintProvider>
                    </EditorIdContext.Provider>
                </PortalManager>
            </ThemeProvider>,
        );

        expect(
            screen.queryByText("Spawner target 'explore' does not exist."),
        ).toBeNull();
    });
});
