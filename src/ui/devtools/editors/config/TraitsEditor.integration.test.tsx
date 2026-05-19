// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../engine/test/factories";
import { BlueprintConfigSchema } from "../../../../data/schemas/blueprintConfig";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../state/useSessionStore";
import { getByPath } from "../../../../utils/objectUtils";
import { TraitsEditor } from "./TraitsEditor";
import type { TraitDefinition } from "../../../../data/schemas/game/traits";

const filename = "modules/core.cave";
type TraitsMap = Record<string, TraitDefinition>;

const getTraits = () =>
    getByPath(
        useSessionStore.getState().sessions[filename]?.draft,
        "config.traits",
    ) as TraitsMap | undefined;

const renderEditor = () =>
    render(
        <ThemeProvider>
            <TraitsEditor filename={filename} />
        </ThemeProvider>,
    );

describe("TraitsEditor integration", () => {
    beforeEach(() => {
        localStorage.clear();
        useSessionStore.setState({ sessions: {} });
        useSessionStore
            .getState()
            .initSession(filename, createCartridge(filename));
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
        localStorage.clear();
    });

    it("renders empty traits registry safely", () => {
        renderEditor();
        expect(screen.getByText("Global Traits")).toBeDefined();
        expect(screen.getByText("No traits defined yet.")).toBeDefined();
    });

    it("renders traits already present in config", () => {
        const module = createCartridge(filename);
        module.config = BlueprintConfigSchema.parse({
            traits: {
                steady: { id: "steady", label: "Steady" },
            },
        });
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, module);

        renderEditor();

        expect(screen.getByText("steady")).toBeDefined();
    });

    it("adds a new trait to the registry on add click", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Trait"));
        const traits = getTraits()!;
        const ids = Object.keys(traits);
        expect(ids).toHaveLength(1);
        expect(traits[ids[0]].label).toBe("New Trait");
    });

    it("shows the new trait row in the UI after adding", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Trait"));
        const traitId = Object.keys(getTraits()!)[0];
        expect(screen.getByText(traitId)).toBeDefined();
        expect(screen.queryByText("No traits defined yet.")).toBeNull();
    });

    it("removes a trait from the registry on delete", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Trait"));
        const traitId = Object.keys(getTraits()!)[0];
        fireEvent.click(screen.getByText(traitId));
        fireEvent.click(screen.getByText("Remove Trait"));
        expect(getTraits()).toEqual({});
        expect(screen.getByText("No traits defined yet.")).toBeDefined();
    });

    it("adds multiple traits independently", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Trait"));
        fireEvent.click(screen.getByText("+ Add Trait"));
        expect(Object.keys(getTraits()!)).toHaveLength(2);
    });

    it("each new trait has a unique id key", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Trait"));
        fireEvent.click(screen.getByText("+ Add Trait"));
        const ids = Object.keys(getTraits()!);
        expect(new Set(ids).size).toBe(2);
    });
});

