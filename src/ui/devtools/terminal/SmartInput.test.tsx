// @vitest-environment jsdom
import React from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SmartInput } from "../../../lib/terminal/components/SmartInput";
import { Suggestion } from "../../../lib/terminal/types";
import { PopoverSlotProvider } from "../../../lib/terminal/PopoverSlot";
import { renderPopoverSlot } from "../../lib/atoms/popover/popoverSlotRenderer";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";

afterEach(() => {
    cleanup();
});

// Wrapper to provide theme + portal + the real Popover (injected via the slot
// the app wires up in production) so SmartInput's suggestions reach the portal.
const renderWithTheme = (ui: React.ReactElement) => {
    return render(
        <ThemeProvider>
            <PortalManager>
                <PopoverSlotProvider value={renderPopoverSlot}>
                    {ui}
                </PopoverSlotProvider>
            </PortalManager>
        </ThemeProvider>,
    );
};

describe("SmartInput (Component)", () => {
    const mockSuggestions: Suggestion[] = [
        { label: "apple", type: "value", insertText: "apple" },
        { label: "banana", type: "value", insertText: "banana" },
    ];

    it("should render input value", () => {
        renderWithTheme(
            <SmartInput
                value="test input"
                suggestions={[]}
                onChange={() => {}}
                onSubmit={() => {}}
            />,
        );
        expect(screen.getByDisplayValue("test input")).toBeDefined();
    });

    it("should trigger onChange when typing", () => {
        const handleChange = vi.fn();
        renderWithTheme(
            <SmartInput
                value=""
                suggestions={[]}
                onChange={handleChange}
                onSubmit={() => {}}
            />,
        );

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "h" } });
        expect(handleChange).toHaveBeenCalledWith("h");
    });

    it("renders suggestions in the portal layer", () => {
        renderWithTheme(
            <SmartInput
                value="app"
                suggestions={mockSuggestions}
                onChange={() => {}}
                onSubmit={() => {}}
            />,
        );

        const input = screen.getByRole("textbox");
        fireEvent.focus(input);

        expect(document.querySelector("#portal-floats")?.textContent).toContain(
            "apple",
        );
    });

    it("replaces the token at the cursor", () => {
        const handleChange = vi.fn();
        renderWithTheme(
            <SmartInput
                value="GIVE wood TO chest"
                suggestions={mockSuggestions}
                onChange={handleChange}
                onSubmit={() => {}}
            />,
        );

        const input = screen.getByRole("textbox");
        if (!(input instanceof HTMLInputElement)) {
            throw new TypeError("Expected an input element.");
        }
        fireEvent.focus(input);
        input.setSelectionRange(5, 9);

        const suggestionItem = screen.getByText("apple");
        fireEvent.click(suggestionItem);

        expect(handleChange).toHaveBeenCalledWith("GIVE apple TO chest");
    });

    it("preserves focus when clicking a suggestion", () => {
        const handleChange = vi.fn();
        renderWithTheme(
            <SmartInput
                value="app"
                suggestions={mockSuggestions}
                onChange={handleChange}
                onSubmit={() => {}}
            />,
        );

        const input = screen.getByRole("textbox");
        input.focus();
        fireEvent.focus(input);
        expect(document.activeElement).toBe(input);

        const suggestionItem = screen.getByText("apple");
        fireEvent.mouseDown(suggestionItem);
        fireEvent.click(suggestionItem);

        expect(document.activeElement).toBe(input);
    });

    it("hides suggestions on blur", () => {
        renderWithTheme(
            <SmartInput
                value="app"
                suggestions={mockSuggestions}
                onChange={() => {}}
                onSubmit={() => {}}
            />,
        );

        const input = screen.getByRole("textbox");
        fireEvent.focus(input);
        expect(document.querySelector("#portal-floats")?.textContent).toContain(
            "apple",
        );

        fireEvent.blur(input);
        expect(
            document.querySelector("#portal-floats")?.textContent,
        ).not.toContain("apple");
    });
});
