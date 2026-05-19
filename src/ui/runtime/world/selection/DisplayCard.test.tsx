// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { DisplayCard } from "./DisplayCard";

describe("DisplayCard", () => {
    it("keeps the title visible and renders description after it", () => {
        render(
            <ThemeProvider>
                <DisplayCard
                    entity={
                        {
                            id: "display-1",
                            display: {
                                label: "Waystone",
                                description: "A carved marker.",
                            },
                        } as any
                    }
                    runtime={null}
                />
            </ThemeProvider>,
        );
        const title = screen.getByText("Waystone");
        const description = screen.getByText("A carved marker.");
        expect(
            title.compareDocumentPosition(description) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });
});
