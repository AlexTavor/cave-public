// @vitest-environment jsdom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { BlueprintProvider } from "../../BlueprintContext";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { useSessionStore } from "../../../../state/useSessionStore";
import { AssignmentFiltersSection } from "./AssignmentFiltersSection";

const workspaceServiceMock = vi.hoisted(() => ({
    activeCartridge: null as any,
}));

vi.mock("../../../../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: workspaceServiceMock,
}));

const filename = "game.json";
const blueprintId = "worker";
const basePath = `blueprints.${blueprintId}._editor.assignment`;

const renderSection = () =>
    render(
        <ThemeProvider>
            <BlueprintProvider value={{ filename, blueprintId }}>
                <AssignmentFiltersSection basePath={basePath} />
            </BlueprintProvider>
        </ThemeProvider>,
    );

describe("AssignmentFiltersSection", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore
            .getState()
            .initSession(
                filename,
                createCartridge(filename, {
                    blueprints: { [blueprintId]: createBlueprint(blueprintId) },
                }),
            );
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                draft.blueprints[blueprintId]._editor = {
                    assignment: {
                        filter: [
                            { kind: "required_traits_all", ids: [""] },
                            { kind: "required_habiti_all", ids: [""] },
                        ],
                    },
                } as any;
            });
        });
        workspaceServiceMock.activeCartridge = {
            config: {
                traits: { brave: {} },
                habiti: { forager: {} },
            },
        };
    });

    afterEach(() => {
        cleanup();
        workspaceServiceMock.activeCartridge = null;
        useSessionStore.setState({ sessions: {} });
    });

    it("includes project trait and habitus ids in filter suggestions", () => {
        renderSection();
        fireEvent.click(screen.getByRole("button", { name: "Filter 2" }));
        const values = Array.from(document.querySelectorAll("option")).map(
            (option) => option.getAttribute("value"),
        );
        expect(values).toContain("brave");
        expect(values).toContain("forager");
    });

    it("keeps the ids input focused while typing", () => {
        renderSection();
        const input = document.querySelector<HTMLInputElement>(
            'input[list="blueprints.worker._editor.assignment.filter.0.ids-options"]',
        );
        if (!input) throw new Error("Expected filter ids input");
        input.focus();
        fireEvent.change(input, { target: { value: "b" } });
        expect(document.activeElement).toBe(input);
        expect(input.value).toBe("b");
    });
});
