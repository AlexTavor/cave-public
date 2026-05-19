// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createCartridge } from "../../../../../../engine/test/factories";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../../state/useSessionStore";
import { HabitusEffectRow } from "./HabitusEffectRow";

describe("HabitusEffectRow increase_max_purge", () => {
    it("renders shared fields without attribute, resource, or producer tag inputs", () => {
        const filename = "increase-max-purge.cave";
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
                                    description: "",
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
        expect(screen.getByText("Amount")).toBeDefined();
        expect(screen.getByText("Description")).toBeDefined();
        expect(screen.queryByText("Attribute")).toBeNull();
        expect(screen.queryByText("Resource")).toBeNull();
        expect(screen.queryByText("Producer Tag")).toBeNull();
    });
});
