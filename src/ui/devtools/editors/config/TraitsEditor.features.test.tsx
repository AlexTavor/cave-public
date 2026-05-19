// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../engine/test/factories";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../state/useSessionStore";
import { useToastStore } from "../../toast/toastStore";
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

describe("TraitsEditor toasts and rename", () => {
    beforeEach(() => {
        localStorage.clear();
        useSessionStore.setState({ sessions: {} });
        useToastStore.setState({ items: [] });
        useSessionStore
            .getState()
            .initSession(filename, createCartridge(filename));
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
        useToastStore.setState({ items: [] });
        localStorage.clear();
    });

    it("shows success toast on add", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Trait"));
        const items = useToastStore.getState().items;
        expect(items).toHaveLength(1);
        expect(items[0].type).toBe("success");
        expect(items[0].message).toContain("added");
    });

    it("shows info toast on delete", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Trait"));
        useToastStore.setState({ items: [] });

        const traitId = Object.keys(getTraits()!)[0];
        fireEvent.click(screen.getByText(traitId));
        fireEvent.click(screen.getByText("Remove Trait"));

        const items = useToastStore.getState().items;
        expect(items).toHaveLength(1);
        expect(items[0].type).toBe("info");
        expect(items[0].message).toContain("removed");
    });

    it("renames trait via double-click on ID", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Trait"));
        const oldId = Object.keys(getTraits()!)[0];

        fireEvent.doubleClick(screen.getByText(oldId));
        const input = screen.getByDisplayValue(oldId);
        fireEvent.change(input, { target: { value: "my-trait" } });
        fireEvent.blur(input);

        const traits = getTraits()!;
        expect(traits["my-trait"]).toBeDefined();
        expect(traits["my-trait"].id).toBe("my-trait");
        expect(traits[oldId]).toBeUndefined();
    });

    it("shows error toast when renaming to duplicate id", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Trait"));
        fireEvent.click(screen.getByText("+ Add Trait"));
        useToastStore.setState({ items: [] });

        const [id1, id2] = Object.keys(getTraits()!);
        fireEvent.doubleClick(screen.getByText(id1));
        const input = screen.getByDisplayValue(id1);
        fireEvent.change(input, { target: { value: id2 } });
        fireEvent.blur(input);

        const items = useToastStore.getState().items;
        expect(items.some((t) => t.type === "error")).toBe(true);
        expect(getTraits()![id1]).toBeDefined();
    });
});

