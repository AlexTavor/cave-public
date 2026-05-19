// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../foundation/theme/ThemeProvider";
import { RichText } from "./RichText";
import { RichTextContext } from "./RichTextContext";

const renderRichText = (ui: React.ReactNode) =>
    render(<ThemeProvider>{ui}</ThemeProvider>);

describe("RichText", () => {
    it("renders attribute tags with config colors and title casing", () => {
        renderRichText(<RichText text="[attribute]body[/attribute]" />);

        const attribute = screen.getByText("Body");
        expect(globalThis.getComputedStyle(attribute).color).toBe(
            "rgb(233, 30, 99)",
        );
    });

    it("supports custom processors from RichTextContext", () => {
        renderRichText(
            <RichTextContext.Provider
                value={{
                    processors: {
                        echo: (node, { key, getTextContent }) => (
                            <span key={key}>
                                {getTextContent(node.children).toUpperCase()}
                            </span>
                        ),
                    },
                }}
            >
                <RichText text="[echo]mind[/echo]" />
            </RichTextContext.Provider>,
        );

        expect(screen.getByText("MIND")).toBeTruthy();
    });
});
