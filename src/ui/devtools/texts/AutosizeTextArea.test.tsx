// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { AutosizeTextArea } from "./AutosizeTextArea";

describe("AutosizeTextArea", () => {
    it("updates its height when content grows", () => {
        const { rerender } = render(
            <ThemeProvider>
                <AutosizeTextArea value="short" readOnly />
            </ThemeProvider>,
        );
        const area = screen.getByDisplayValue("short") as HTMLTextAreaElement;
        Object.defineProperty(area, "scrollHeight", {
            configurable: true,
            value: 84,
        });
        rerender(
            <ThemeProvider>
                <AutosizeTextArea value="much longer value" readOnly />
            </ThemeProvider>,
        );
        expect(
            (
                screen.getByDisplayValue(
                    "much longer value",
                ) as HTMLTextAreaElement
            ).style.height,
        ).toBe("84px");
    });
});
