// @vitest-environment jsdom
import React from "react";
import {
    render,
    fireEvent,
    screen,
    act,
    cleanup,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

const initDesigner = () => {
    act(() => {
        useSessionStore.getState().updateDraft(filename, (draft) => {
            const target = draft.blueprints[blueprintId];
            if (!target) return;
            target._editor = { abilities: {} };
        });
    });
};

describe("DesignerMode abilities", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, baseModule);
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("adds storage ability without crashing", () => {
        initDesigner();
        renderWithProviders(<DesignerMode />);

        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "storage" },
        });
        fireEvent.click(screen.getByText("Add Ability"));

        expect(screen.getByText("Capacity")).toBeDefined();
    });

    it("adds cycle ability without crashing", () => {
        initDesigner();
        renderWithProviders(<DesignerMode />);

        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "cycle" },
        });
        fireEvent.click(screen.getByText("Add Ability"));

        expect(screen.getByText("Max Progress")).toBeDefined();
    });

    it("adds production ability without crashing", () => {
        initDesigner();
        renderWithProviders(<DesignerMode />);

        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "production" },
        });
        fireEvent.click(screen.getByText("Add Ability"));

        expect(screen.getByText("Amount")).toBeDefined();
    });

    it("adds injection ability without crashing", () => {
        initDesigner();
        renderWithProviders(<DesignerMode />);

        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "injection" },
        });
        fireEvent.click(screen.getByText("Add Ability"));

        expect(screen.getByText("Injections")).toBeDefined();
    });

    it("adds spawner and sampler abilities without crashing", () => {
        initDesigner();
        renderWithProviders(<DesignerMode />);

        const abilitySelect = () => screen.getAllByRole("combobox")[0];

        fireEvent.change(abilitySelect(), {
            target: { value: "spawner" },
        });
        fireEvent.click(screen.getByText("Add Ability"));
        expect(screen.getByText("Blueprint")).toBeDefined();

        fireEvent.change(abilitySelect(), {
            target: { value: "sampler" },
        });
        fireEvent.click(screen.getByText("Add Ability"));
        expect(screen.getByText("Source")).toBeDefined();
    });
});
