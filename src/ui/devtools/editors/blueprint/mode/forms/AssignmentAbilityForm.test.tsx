// @vitest-environment jsdom
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
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { AssignmentAbilityForm } from "./AssignmentAbilityForm";

const filename = "game.json";
const blueprintId = "entity_alpha";
const basePath = `blueprints.${blueprintId}._editor.abilities.assignment`;
const module = createCartridge(filename, {
    blueprints: {
        [blueprintId]: createBlueprint(blueprintId, {
            components: {},
            _editor: {
                abilities: {
                    assignment: {
                        slots: 1,
                        locking: true,
                        filter: [],
                        minimums: [],
                        duration: 10,
                        results: [],
                        showProgress: true,
                        oneOff: false,
                    },
                },
            },
        }),
    },
});
const renderForm = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <BlueprintProvider value={{ filename, blueprintId }}>
                    <AssignmentAbilityForm basePath={basePath} />
                </BlueprintProvider>
            </PortalManager>
        </ThemeProvider>,
    );
const getButton = (name: string) => screen.getByRole("button", { name });

describe("AssignmentAbilityForm", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, module);
    });
    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders the One-Off checkbox", () => {
        renderForm();
        expect(screen.getByText("One-Off")).toBeDefined();
        expect(screen.queryByText("Show Progress")).toBeNull();
    });

    it("adds destroy bodies once and then disables the button", () => {
        renderForm();
        fireEvent.click(getButton("Add Destroy Bodies"));
        expect(screen.getByText("Destroy Bodies")).toBeDefined();
        expect(
            (getButton("Add Destroy Bodies") as HTMLButtonElement).disabled,
        ).toBe(true);
    });

    it("adds transfer habiti once and then disables the button", () => {
        renderForm();
        fireEvent.click(getButton("Add Transfer Habiti"));
        expect(screen.getByText("Transfer Habiti")).toBeDefined();
        expect(
            (getButton("Add Transfer Habiti") as HTMLButtonElement).disabled,
        ).toBe(true);
    });

    it("adds repeatable spawn resource rows", () => {
        renderForm();
        act(() => {
            fireEvent.click(getButton("Add Spawn Resource"));
            fireEvent.click(getButton("Add Spawn Resource"));
        });
        const draft = useSessionStore.getState().sessions[filename]
            ?.draft as any;
        expect(
            draft.blueprints[blueprintId]._editor.abilities.assignment.results
                .length,
        ).toBeGreaterThan(1);
    });
});
