// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../../../../../lib/atoms/tooltip", () => ({
    SmartTooltip: ({ children, content }: any) => (
        <span data-tooltip={content}>{children}</span>
    ),
}));
import { createCartridge } from "../../../../../../engine/test/factories";
import { getByPath } from "../../../../../../utils/objectUtils";
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
    return filename;
};

describe("HabitusEffectRow generate description", () => {
    it("renders a generate description button and writes the generated text", () => {
        const filename = renderRow({
            type: "add_absorption_xp_conversion",
            amount: 0.05,
            description: "",
        });
        fireEvent.click(
            screen.getByRole("button", { name: "Generate Description" }),
        );
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                "config.habiti.human.effects.0.description",
            ),
        ).toBe("+5% [icon=xp]XP");
    });

    it("updates only the description field on valid rows", () => {
        const filename = renderRow({
            type: "add_resource_gain_multiplier",
            resource: "wood",
            amount: 0.1,
            description: "stale",
        });
        fireEvent.click(
            screen.getByRole("button", { name: "Generate Description" }),
        );
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                "config.habiti.human.effects.0",
            ),
        ).toEqual({
            type: "add_resource_gain_multiplier",
            resource: "wood",
            amount: 0.1,
            description: "+10% [icon=wood]Wood",
        });
    });
});
