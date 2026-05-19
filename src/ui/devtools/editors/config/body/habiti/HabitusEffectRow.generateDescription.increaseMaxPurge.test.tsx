// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createCartridge } from "../../../../../../engine/test/factories";
import { getByPath } from "../../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../../state/useSessionStore";
import { HabitusEffectRow } from "./HabitusEffectRow";

describe("HabitusEffectRow generate description increase_max_purge", () => {
    it("updates only the description field with the generated purge text", () => {
        const filename = "increase-max-purge-generate.cave";
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                config: {
                    habiti: {
                        human: {
                            id: "human",
                            label: "Human",
                            description: "",
                            summary: "",
                            type: "species",
                            excludes: [],
                            effects: [
                                {
                                    type: "increase_max_purge",
                                    amount: 25,
                                    description: "stale",
                                },
                            ],
                        },
                    },
                },
            }),
        );
        render(
            <ThemeProvider>
                <HabitusEffectRow
                    filename={filename}
                    path="config.habiti.human.effects.0"
                    index={0}
                    onDelete={vi.fn()}
                />
            </ThemeProvider>,
        );
        fireEvent.click(
            screen.getByRole("button", { name: "Generate Description" }),
        );
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                "config.habiti.human.effects.0",
            ),
        ).toEqual({
            type: "increase_max_purge",
            amount: 25,
            description:
                "+25 max [color=gold]Suspicion[/color] - delays the Purge",
        });
    });
});
