// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { ThoughtOverlay } from "./ThoughtOverlay";

const pause = vi.fn();
const continueThought = vi.fn();

vi.mock("./useThoughtState", () => ({
    useThoughtState: () => ({
        thought: {
            active: true,
            thoughtId: "intro",
            body: "Wake up.",
            resumeStatus: "running",
        },
        continueThought,
    }),
}));

vi.mock("../state/useRuntimeStore", () => ({
    useRuntimeStore: (selector: (state: any) => any) => selector({ pause }),
}));

describe("ThoughtOverlay", () => {
    beforeEach(() => {
        pause.mockClear();
        continueThought.mockClear();
    });

    it("renders active thought content and continues on click", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <ThoughtOverlay />
                </PortalManager>
            </ThemeProvider>,
        );

        expect(screen.getByText("Wake up.")).toBeDefined();
        fireEvent.click(screen.getByText("CONTINUE"));
        expect(pause).toHaveBeenCalled();
        expect(continueThought).toHaveBeenCalled();
    });
});
