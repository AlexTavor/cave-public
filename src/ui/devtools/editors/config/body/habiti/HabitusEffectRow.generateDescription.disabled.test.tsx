// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../../../../../lib/atoms/tooltip", () => ({
    SmartTooltip: ({ children, content }: any) => (
        <span data-tooltip={content}>{children}</span>
    ),
}));
import { createCartridge } from "../../../../../../engine/test/factories";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../../state/useSessionStore";
import { HabitusEffectRow } from "./HabitusEffectRow";

afterEach(() => cleanup());

let nextSessionId = 0;

const renderRow = (effect: Record<string, unknown>, habitusId = "human") => {
    nextSessionId += 1;
    const filename = `${habitusId}-${nextSessionId}.cave`;
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(
        filename,
        createCartridge(filename, {
            config: {
                habiti: {
                    [habitusId]: {
                        id: habitusId,
                        label: "Human",
                        description: "",
                        summary: "",
                        type: "species",
                        effects: [effect],
                        excludes: [],
                    },
                },
            },
        }),
    );
    render(
        <ThemeProvider>
            <HabitusEffectRow
                filename={filename}
                path={`config.habiti.${habitusId}.effects.0`}
                index={0}
                onDelete={vi.fn()}
            />
        </ThemeProvider>,
    );
};

const expectDisabledState = (tooltip: string) => {
    const button = screen.getByRole("button", { name: "Generate Description" });
    const tooltipHost = button.closest("[data-tooltip]");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(
        tooltipHost instanceof HTMLElement
            ? tooltipHost.dataset.tooltip
            : undefined,
    ).toBe(tooltip);
};

describe("HabitusEffectRow generate description disabled states", () => {
    it("disables generation for resource multipliers without a resource", () => {
        renderRow({
            type: "add_resource_gain_multiplier",
            amount: 0.1,
            description: "",
        });
        expectDisabledState(
            "Generation is unavailable until Resource is not empty.",
        );
    });

    it("disables generation for producer-output effects without a producer tag", () => {
        renderRow(
            {
                type: "add_producer_output_multiplier",
                amount: 0.1,
                description: "",
            },
            "smith",
        );
        expectDisabledState(
            "Generation is unavailable until Producer Tag is not empty.",
        );
    });
});
