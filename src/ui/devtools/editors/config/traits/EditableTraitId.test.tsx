// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { EditableTraitId } from "./EditableTraitId";

describe("EditableTraitId", () => {
    afterEach(cleanup);

    const renderEditable = (onRename = vi.fn(() => null)) =>
        render(
            <ThemeProvider>
                <EditableTraitId traitId="fire" onRename={onRename} />
            </ThemeProvider>,
        );

    it("displays the trait id as text", () => {
        renderEditable();
        expect(screen.getByText("fire")).toBeDefined();
    });

    it("enters edit mode on double-click", () => {
        renderEditable();
        fireEvent.doubleClick(screen.getByText("fire"));
        expect(screen.getByDisplayValue("fire")).toBeDefined();
    });

    it("calls onRename on blur with a new value", () => {
        const onRename = vi.fn(() => null);
        renderEditable(onRename);
        fireEvent.doubleClick(screen.getByText("fire"));

        const input = screen.getByDisplayValue("fire");
        fireEvent.change(input, { target: { value: "ice" } });
        fireEvent.blur(input);

        expect(onRename).toHaveBeenCalledWith("ice");
    });

    it("does not call onRename if value unchanged", () => {
        const onRename = vi.fn(() => null);
        renderEditable(onRename);
        fireEvent.doubleClick(screen.getByText("fire"));
        fireEvent.blur(screen.getByDisplayValue("fire"));

        expect(onRename).not.toHaveBeenCalled();
    });

    it("cancels on Escape", () => {
        const onRename = vi.fn(() => null);
        renderEditable(onRename);
        fireEvent.doubleClick(screen.getByText("fire"));

        const input = screen.getByDisplayValue("fire");
        fireEvent.change(input, { target: { value: "ice" } });
        fireEvent.keyDown(input, { key: "Escape" });

        expect(onRename).not.toHaveBeenCalled();
        expect(screen.getByText("fire")).toBeDefined();
    });

    it("does not call onRename with empty value", () => {
        const onRename = vi.fn(() => null);
        renderEditable(onRename);
        fireEvent.doubleClick(screen.getByText("fire"));

        const input = screen.getByDisplayValue("fire");
        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.blur(input);

        expect(onRename).not.toHaveBeenCalled();
    });
});
