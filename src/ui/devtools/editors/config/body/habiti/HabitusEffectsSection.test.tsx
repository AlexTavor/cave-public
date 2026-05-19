// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../../engine/test/factories";
import { getByPath } from "../../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../../state/useSessionStore";
import { HabitusEffectsSection } from "./HabitusEffectsSection";

describe("HabitusEffectsSection", () => {
    it("removes an authored effect from the habitus", () => {
        const filename = "test.cave";
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
                            effects: [
                                {
                                    type: "add_absorption_xp_conversion",
                                    amount: 0.05,
                                    description: "one",
                                },
                                {
                                    type: "add_cave_attribute",
                                    attribute: "body",
                                    amount: 1,
                                    description: "two",
                                },
                            ],
                            excludes: [],
                        },
                    },
                },
            }),
        );
        render(
            <ThemeProvider>
                <HabitusEffectsSection
                    filename={filename}
                    basePath="config.habiti.human"
                />
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByText("Effect 2"));
        fireEvent.click(screen.getAllByText("Remove Effect")[1]);
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                "config.habiti.human.effects",
            ),
        ).toEqual([
            {
                type: "add_absorption_xp_conversion",
                amount: 0.05,
                description: "one",
            },
        ]);
    });
});
