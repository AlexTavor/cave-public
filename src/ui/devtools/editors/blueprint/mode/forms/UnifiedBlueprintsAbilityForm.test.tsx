// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { UnifiedBlueprintsAbilityForm } from "./UnifiedBlueprintsAbilityForm";

const workspaceServiceMock = vi.hoisted(() => ({
    activeCartridge: null as any,
}));
vi.mock("../../../../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: workspaceServiceMock,
}));

afterEach(() => {
    cleanup();
    workspaceServiceMock.activeCartridge = null;
    useSessionStore.setState({ sessions: {} });
});

describe("UnifiedBlueprintsAbilityForm", () => {
    it("persists the tag and toggle and exposes tag suggestions", () => {
        useSessionStore
            .getState()
            .initSession(
                "test.json",
                createCartridge("test.json", {
                    blueprints: {
                        worker: createBlueprint("worker", {
                            tags: ["draft-tag"],
                            _editor: {
                                abilities: {
                                    unifiedBlueprints: [
                                        { tag: "", spawnWhenPeerSpawns: false },
                                    ],
                                },
                            },
                        }),
                    },
                }),
            );
        workspaceServiceMock.activeCartridge = {
            blueprints: { peer: { tags: ["linked-tag"] } },
        };
        render(
            <ThemeProvider>
                <BlueprintProvider
                    value={{ filename: "test.json", blueprintId: "worker" }}
                >
                    <UnifiedBlueprintsAbilityForm basePath="blueprints.worker._editor.abilities.unifiedBlueprints.0" />
                </BlueprintProvider>
            </ThemeProvider>,
        );
        const input = document.querySelector("input[list]") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "quest-a" } });
        fireEvent.blur(input);
        fireEvent.click(screen.getByLabelText("Spawn When Peer Spawns"));
        const values = Array.from(document.querySelectorAll("option")).map(
            (option) => option.getAttribute("value"),
        );
        expect(values).toContain("draft-tag");
        expect(values).toContain("linked-tag");
        expect(
            useSessionStore.getState().sessions["test.json"]?.draft.blueprints
                .worker._editor?.abilities?.unifiedBlueprints?.[0],
        ).toEqual({ tag: "quest-a", spawnWhenPeerSpawns: true });
    });
});
