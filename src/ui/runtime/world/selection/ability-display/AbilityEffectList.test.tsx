// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { AbilityEffectList } from "./AbilityEffectList";

vi.mock("../../../../lib/atoms/tooltip", () => ({
    SmartTooltip: ({ children, content }: any) => (
        <div>
            {children}
            {content}
        </div>
    ),
}));

describe("AbilityEffectList", () => {
    it("renders header lines before effect rows and wires tooltips", () => {
        const { container } = render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <AbilityEffectList
                        title="Production"
                        headerLines={[
                            {
                                id: "header-1",
                                tokens: [
                                    { kind: "text", text: "3 " },
                                    { kind: "icon", iconId: "wood" },
                                    { kind: "text", text: " wood in 2 s" },
                                ],
                                tooltipTitle: "Predicted",
                                tooltipLines: ["Next cycle"],
                            },
                        ]}
                        effects={[
                            {
                                id: "wood",
                                iconId: "wood",
                                label: "wood",
                                valueText: "+3",
                                tone: "positive",
                                tooltipTitle: "Produced on cycle completion",
                                tooltipLines: ["Stored on self"],
                            },
                        ]}
                    />
                </IconRegistryProvider>
            </ThemeProvider>,
        );

        expect(screen.getByText("Production")).toBeTruthy();
        expect(container.textContent).toContain("wood in 2 s");
        expect(screen.getByText("wood")).toBeTruthy();
        expect(screen.getByText("+3")).toBeTruthy();
        expect(screen.getByText("Predicted")).toBeTruthy();
        expect(screen.getByText("Produced on cycle completion")).toBeTruthy();
    });
});
