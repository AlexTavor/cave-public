// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { HabitiList } from "./HabitiList";

afterEach(() => cleanup());

vi.mock("../../../../lib/atoms/tooltip", () => ({
    SmartTooltip: ({ children, content }: any) => (
        <div>
            {children}
            <div>{content}</div>
        </div>
    ),
}));

describe("HabitiList", () => {
    it("renders pills and shows cave-only summaries plus tooltip text", () => {
        render(
            <ThemeProvider>
                <HabitiList
                    items={[
                        {
                            id: "body",
                            label: "Body Only",
                            description: "Carried by a body.",
                            summary: "",
                            effectDescriptions: [],
                            isOwnedByCave: false,
                        },
                        {
                            id: "cave",
                            label: "Cave Owned",
                            description: "Lives in Cave.",
                            summary: "Permanent bonus.",
                            effectDescriptions: ["+5% absorption XP."],
                            isOwnedByCave: true,
                        },
                    ]}
                />
            </ThemeProvider>,
        );
        expect(screen.getByText("Body Only")).toBeTruthy();
        expect(screen.getByText("Cave Owned")).toBeTruthy();
        expect(screen.getByText("Permanent bonus.")).toBeTruthy();
        expect(screen.getByText("Lives in Cave.")).toBeTruthy();
        expect(screen.getByText("+5% absorption XP.")).toBeTruthy();
        expect(
            globalThis.getComputedStyle(
                screen.getByText("Body Only").parentElement as HTMLElement,
            ).color,
        ).toBe("rgb(255, 152, 0)");
        expect(
            globalThis.getComputedStyle(
                screen.getByText("Cave Owned").parentElement as HTMLElement,
            ).color,
        ).toBe("rgb(187, 187, 187)");
    });

    it("renders all habiti gold when explicitly requested", () => {
        render(
            <ThemeProvider>
                <HabitiList
                    items={[
                        {
                            id: "cave",
                            label: "Cave Owned",
                            description: "Lives in Cave.",
                            summary: "Permanent bonus.",
                            effectDescriptions: [],
                            isOwnedByCave: true,
                        },
                    ]}
                    showAllGold
                />
            </ThemeProvider>,
        );
        expect(
            globalThis.getComputedStyle(
                screen.getByText("Cave Owned").parentElement as HTMLElement,
            ).color,
        ).toBe("rgb(255, 152, 0)");
    });

    it("omits tooltip-only text when an item has no authored hover content", () => {
        render(
            <ThemeProvider>
                <HabitiList
                    items={[
                        {
                            id: "empty",
                            label: "Empty",
                            description: "",
                            summary: "",
                            effectDescriptions: [],
                            isOwnedByCave: false,
                        },
                    ]}
                />
            </ThemeProvider>,
        );
        expect(screen.getByText("Empty")).toBeTruthy();
        expect(screen.queryByText("+5% absorption XP.")).toBeNull();
    });
});
