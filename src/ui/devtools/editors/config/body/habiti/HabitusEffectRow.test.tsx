// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCartridge } from "../../../../../../engine/test/factories";
import { getByPath } from "../../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../../state/useSessionStore";
import { HabitusEffectRow } from "./HabitusEffectRow";

afterEach(() => cleanup());

describe("HabitusEffectRow", () => {
    it("renders and commits the authored effect description field", () => {
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
                                    description: "",
                                },
                            ],
                            excludes: [],
                        },
                    },
                },
            }),
        );
        const { container } = render(
            <ThemeProvider>
                <HabitusEffectRow
                    filename={filename}
                    path="config.habiti.human.effects.0"
                    index={0}
                    onDelete={vi.fn()}
                />
            </ThemeProvider>,
        );
        const textarea = container.querySelector("textarea");
        expect(textarea).not.toBeNull();
        if (!textarea) throw new Error("Expected textarea");
        fireEvent.change(textarea, { target: { value: "+5% absorption XP." } });
        fireEvent.blur(textarea);
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                "config.habiti.human.effects.0.description",
            ),
        ).toBe("+5% absorption XP.");
    });

    it("shows a remove effect button and triggers deletion", () => {
        const onDelete = vi.fn();
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
                                    description: "",
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
                <HabitusEffectRow
                    filename={filename}
                    path="config.habiti.human.effects.0"
                    index={0}
                    onDelete={onDelete}
                />
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByText("Remove Effect"));
        expect(onDelete).toHaveBeenCalledTimes(1);
    });
});
