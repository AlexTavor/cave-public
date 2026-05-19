/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { ViewEditorTransferNodeRadiusFields } from "./ViewEditorTransferNodeRadiusFields";

describe("ViewEditorTransferNodeRadiusFields", () => {
    it("updates the transfer radius values", () => {
        const radius = {
            min: 10,
            max: 20,
            updateMin: vi.fn(),
            updateMax: vi.fn(),
        };
        render(
            <ThemeProvider>
                <ViewEditorTransferNodeRadiusFields radius={radius} />
            </ThemeProvider>,
        );
        fireEvent.change(screen.getByLabelText("Radius Min"), {
            target: { value: "12" },
        });
        fireEvent.change(screen.getByLabelText("Radius Max"), {
            target: { value: "24" },
        });
        expect(radius.updateMin).toHaveBeenCalledWith(12);
        expect(radius.updateMax).toHaveBeenCalledWith(24);
    });
});
