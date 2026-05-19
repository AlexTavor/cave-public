// @vitest-environment jsdom
import {
    render,
    fireEvent,
    screen,
    cleanup,
    waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { useSessionStore } from "../../state/useSessionStore";
import { BehaviorsPanel } from "./BehaviorsPanel";
import type { Blueprint } from "../../../../data/schemas/blueprint";
import { BlueprintProvider } from "../blueprint/BlueprintContext";
import { createCartridge } from "../../../../engine/test/factories";

const filename = "game.json";
const blueprintId = "entity_a";
const sessionId = filename;

const baseBlueprint: Blueprint = {
    id: "entity_a",
    label: "Entity A",
    tags: [],
    components: {},
};

const renderPanel = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <BlueprintProvider value={{ filename, blueprintId }}>
                    <BehaviorsPanel />
                </BlueprintProvider>
            </PortalManager>
        </ThemeProvider>,
    );

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
});

beforeEach(() => {
    useSessionStore.setState({ sessions: {} });
    globalThis.localStorage?.removeItem(`cave.moduleDraft:${filename}`);
    useSessionStore.getState().initSession(
        sessionId,
        createCartridge(filename, {
            blueprints: { [blueprintId]: baseBlueprint },
        }),
    );
});

describe("BehaviorsPanel", () => {
    it("adds a behavior and renders it", async () => {
        renderPanel();

        const input = screen.getByPlaceholderText(
            "WHEN self.state.hp.value < 10 DO SPAWN ghost AND KILL self",
        );
        fireEvent.change(input, {
            target: { value: "WHEN true DO SET self.state.hp.value 1" },
        });
        const addButton = screen.getByRole("button", { name: "Add" });
        fireEvent.click(addButton);

        await screen.findByText("WHEN true DO SET self.state.hp.value 1");
    });

    it("reacts to external undo", async () => {
        renderPanel();

        const input = screen.getByPlaceholderText(
            "WHEN self.state.hp.value < 10 DO SPAWN ghost AND KILL self",
        );
        fireEvent.change(input, {
            target: { value: "WHEN true DO SET self.state.hp.value 1" },
        });
        const addButton = screen.getByRole("button", { name: "Add" });
        fireEvent.click(addButton);

        await screen.findByText("WHEN true DO SET self.state.hp.value 1");

        useSessionStore.getState().undo(sessionId);

        await waitFor(() => {
            expect(screen.getByText("No behaviors yet.")).toBeDefined();
        });
    });
});
