// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { RuntimeHabitiGainModal } from "./RuntimeHabitiGainModal";

const acknowledge = vi.fn();

vi.mock("../state/useRuntimeStore", () => ({
    useRuntimeStore: (selector: any) =>
        selector({
            runtime: {
                getEntity: () => ({ cave: { ownedHabiti: ["human"] } }),
                getCartridge: () => ({ config: { habiti: {} } }),
            },
        }),
}));
vi.mock("../../lib/atoms/modal", () => ({
    Modal: ({ isOpen, children }: any) =>
        isOpen ? <div>{children}</div> : null,
}));
vi.mock("./useHabitiGainModalState", () => ({
    useHabitiGainModalState: () => ({
        activeItem: {
            habitusIds: ["human"],
            xpTotal: 12,
            resourceTotals: [{ resource: "ore", amount: 3 }],
        },
        acknowledge,
    }),
}));
vi.mock("../../../game/habiti/resolveHabitiDisplayEntries", () => ({
    resolveHabitiDisplayEntries: () => [
        {
            id: "human",
            label: "Human",
            description: "Regular human.",
            summary: "Deepens my memory.",
            effectDescriptions: ["+5% absorption XP."],
            isOwnedByCave: true,
        },
    ],
}));

describe("RuntimeHabitiGainModal", () => {
    it("shows totals and new habiti pills and acknowledges on continue", () => {
        render(
            <ThemeProvider>
                <RuntimeHabitiGainModal />
            </ThemeProvider>,
        );
        expect(screen.getByText("Human")).toBeTruthy();
        fireEvent.click(screen.getByText("Continue"));
        expect(acknowledge).toHaveBeenCalledTimes(1);
    });
});
