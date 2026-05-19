/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import {
    buildDisplayEditorState,
    createDisplayEditorElement,
    renderDisplayEditor,
} from "./DisplayEditor.testUtils";

const displayEditorState = vi.hoisted(() => ({ current: null as any }));

vi.mock("./useDisplayEditor", () => ({
    useDisplayEditor: () => displayEditorState.current,
}));
vi.mock("./useDisplayViewEditor", () => ({
    useDisplayViewEditor: () => null,
}));
vi.mock("../../view-editor/ViewEditorModal", () => ({
    ViewEditorModal: () => null,
}));
vi.mock("../../../../lib/atoms/tooltip", () => ({
    SmartTooltip: ({
        content,
        children,
    }: {
        content: string;
        children: any;
    }) => <span data-tooltip={content}>{children}</span>,
}));

describe("DisplayEditor", () => {
    beforeEach(() => {
        displayEditorState.current = buildDisplayEditorState(vi);
    });
    afterEach(() => {
        cleanup();
    });

    it("renders resource controls and delegates rename", () => {
        renderDisplayEditor();
        expect(screen.getByLabelText<HTMLInputElement>("Style ID").value).toBe(
            "ember",
        );
        expect(screen.getByLabelText<HTMLInputElement>("Glyph Key").value).toBe(
            "flame",
        );
        fireEvent.doubleClick(screen.getAllByText("torch").at(-1) as Element);
        const renameInput = screen.getByDisplayValue("torch");
        fireEvent.change(renameInput, { target: { value: "ember_torch" } });
        fireEvent.blur(renameInput);
        expect(displayEditorState.current.handleRename).toHaveBeenCalledWith(
            "ember_torch",
        );
    });

    it("renders attribute-pool and body variants correctly", () => {
        displayEditorState.current.draft = {
            type: "attribute_pool",
            attribute: "mind",
            tooltip: "Focus",
            tags: [],
        };
        const { rerender } = renderDisplayEditor();
        expect(
            screen.getByLabelText<HTMLSelectElement>("Attribute").value,
        ).toBe("mind");
        expect(screen.queryByLabelText("Style ID")).toBeNull();
        displayEditorState.current.draft = {
            type: "body",
            tooltip: "Self",
            tags: [],
        };
        rerender(createDisplayEditorElement());
        expect(
            screen.queryByText(
                "This display type has no additional authored fields.",
            ),
        ).not.toBeNull();
        expect(screen.queryByLabelText("Attribute")).toBeNull();
    });

    it("updates visible fields after retyping and exposes tooltips", () => {
        const { rerender } = renderDisplayEditor();
        fireEvent.change(screen.getByLabelText("Type"), {
            target: { value: "body" },
        });
        expect(displayEditorState.current.handleRetype).toHaveBeenCalledWith(
            "body",
        );
        displayEditorState.current.draft = {
            type: "body",
            tooltip: "Self",
            tags: [],
        };
        rerender(createDisplayEditorElement());
        expect(screen.queryByLabelText("Style ID")).toBeNull();
        const titleTooltipHost = screen
            .getAllByText("torch")
            .at(-1)
            ?.closest("[data-tooltip]");
        const titleTooltip =
            titleTooltipHost instanceof HTMLElement
                ? titleTooltipHost.dataset.tooltip
                : undefined;
        const typeTooltip =
            screen.getByText("Type").parentElement?.dataset.tooltip;
        expect(titleTooltip).toBe(
            "Double-click to rename this display. Current id: torch",
        );
        expect(typeTooltip).toBe(
            "Select the authored display variant for this asset.",
        );
    });
});
