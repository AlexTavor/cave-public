// @vitest-environment jsdom
import React, { useState } from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../blueprint/BlueprintContext";
import { useSessionStore } from "../../state/useSessionStore";
import { ConditionInput } from "./ConditionInput";
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

const ConditionHarness = () => {
    const [value, setValue] = useState("");
    return <ConditionInput value={value} onChange={setValue} />;
};

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
    useSessionStore.getState().initSession(filename, baseModule);
});

describe("ConditionInput", () => {
    it("shows autocomplete suggestions on typing", () => {
        renderWithProviders(<ConditionHarness />);

        const input = screen.getByPlaceholderText("self.state.foo > 5");
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "s" } });

        expect(screen.getByText("self")).toBeDefined();
    });
});
