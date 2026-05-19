// @vitest-environment jsdom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../BlueprintContext";
import { useSessionStore } from "../../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import { DesignerMode } from "./DesignerMode";

const filename = "game.json";
const blueprintId = "entity_alpha";
const baseModule = createCartridge(filename, {
    blueprints: {
        [blueprintId]: createBlueprint(blueprintId, { components: {} }),
    },
});

describe("DesignerMode conditional activation", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
        act(() => {
            useSessionStore.getState().updateDraft(filename, (draft) => {
                draft.blueprints[blueprintId]._editor = { abilities: {} };
            });
        });
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("adds conditional activation more than once", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <BlueprintProvider value={{ filename, blueprintId }}>
                        <DesignerMode />
                    </BlueprintProvider>
                </PortalManager>
            </ThemeProvider>,
        );
        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "conditionalActivation" },
        });
        fireEvent.click(screen.getByText("Add Ability"));
        fireEvent.click(screen.getByText("Add Ability"));
        expect(screen.getByText("Conditional Activation 1")).toBeTruthy();
        expect(screen.getByText("Conditional Activation 2")).toBeTruthy();
    });
});
