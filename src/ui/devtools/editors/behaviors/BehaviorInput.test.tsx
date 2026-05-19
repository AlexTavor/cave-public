// @vitest-environment jsdom
import React from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { BehaviorInput } from "./BehaviorInput";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../blueprint/BlueprintContext";
import { useSessionStore } from "../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../engine/test/factories";

const filename = "game.json";
const blueprintId = "entity_alpha";
const baseModule = createCartridge(filename, {
    blueprints: {
        [blueprintId]: createBlueprint(blueprintId, { components: {} }),
    },
});

const renderWithProviders = (ui: React.ReactElement) =>
    render(
        <ThemeProvider>
            <PortalManager>
                <BlueprintProvider value={{ filename, blueprintId }}>
                    {ui}
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
    useSessionStore.getState().initSession(filename, baseModule);
});

describe("BehaviorInput", () => {
    it("renders verb suggestions for input", () => {
        renderWithProviders(<BehaviorInput onSubmit={() => {}} />);

        const input = screen.getByPlaceholderText(
            "WHEN self.state.hp.value < 10 DO SPAWN ghost AND KILL self",
        );
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "W" } });

        expect(screen.getByText("WHEN")).toBeDefined();
    });

    it("submits on Enter", () => {
        const handleSubmit = vi.fn();
        renderWithProviders(<BehaviorInput onSubmit={handleSubmit} />);

        const input = screen.getByPlaceholderText(
            "WHEN self.state.hp.value < 10 DO SPAWN ghost AND KILL self",
        );
        fireEvent.change(input, {
            target: { value: "WHEN true DO SET self.state.hp.value 1" },
        });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(handleSubmit).toHaveBeenCalledWith(
            "WHEN true DO SET self.state.hp.value 1",
        );
    });

    it("renders error feedback", () => {
        renderWithProviders(
            <BehaviorInput onSubmit={() => {}} error="Bad input" />,
        );

        expect(screen.getByText("Bad input")).toBeDefined();
    });
});
