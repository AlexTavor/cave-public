/** @vitest-environment jsdom */
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    buildDisplayEditorState,
    createDisplayEditorElement,
    renderDisplayEditor,
} from "./DisplayEditor.testUtils";

const displayEditorState = vi.hoisted(() => ({ current: null as any }));

vi.mock("./useDisplayEditor", () => ({
    useDisplayEditor: () => displayEditorState.current,
}));
vi.mock("./useDisplayViewEditor", () => ({ useDisplayViewEditor: () => null }));
vi.mock("../../view-editor/ViewEditorModal", () => ({
    ViewEditorModal: () => null,
}));
vi.mock("../../../../lib/atoms/tooltip", () => ({
    SmartTooltip: ({ children }: { children: any }) => <span>{children}</span>,
}));

describe("DisplayEditor transfer radius section", () => {
    beforeEach(() => {
        displayEditorState.current = buildDisplayEditorState(vi);
    });

    afterEach(() => {
        cleanup();
    });

    it("shows the transfer radius section for resource displays", () => {
        renderDisplayEditor();
        expect(
            screen.getByText("Transfer Node Radius by Value"),
        ).not.toBeNull();
    });

    it("renders the four labels when rule authoring starts", () => {
        renderDisplayEditor();
        fireEvent.click(screen.getByRole("button", { name: "Author Rule" }));
        expect(screen.getByLabelText("Min Value")).not.toBeNull();
        expect(screen.getByLabelText("Min Radius")).not.toBeNull();
        expect(screen.getByLabelText("Max Value")).not.toBeNull();
        expect(screen.getByLabelText("Max Radius")).not.toBeNull();
    });

    it("hides the section for body and attribute_pool displays", () => {
        displayEditorState.current.draft = {
            type: "body",
            tooltip: "Self",
            tags: [],
        };
        const { rerender } = renderDisplayEditor();
        expect(screen.queryByText("Transfer Node Radius by Value")).toBeNull();
        displayEditorState.current.draft = {
            type: "attribute_pool",
            attribute: "mind",
            tooltip: "Focus",
            tags: [],
        };
        rerender(createDisplayEditorElement());
        expect(screen.queryByText("Transfer Node Radius by Value")).toBeNull();
    });

    it("clearing the rule delegates to the grouped handler", () => {
        displayEditorState.current.transferNodeRadiusRule = {
            minValue: 1,
            minRadius: 2,
            maxValue: 5,
            maxRadius: 6,
        };
        renderDisplayEditor();
        fireEvent.click(screen.getByRole("button", { name: "Clear" }));
        expect(
            displayEditorState.current.handleTransferNodeRadiusRuleChange,
        ).toHaveBeenCalledWith(undefined);
    });
});
