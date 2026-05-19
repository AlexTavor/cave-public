// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../../engine/test/factories";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../../state/useSessionStore";
import { HabitusEffectRow } from "./HabitusEffectRow";

describe("HabitusEffectRow producer tag", () => {
    it("renders the producer tag field for producer-output effects", () => {
        const filename = "test.cave";
        useSessionStore.setState({ sessions: {} });
        useSessionStore
            .getState()
            .initSession(
                filename,
                createCartridge(filename, {
                    config: {
                        habiti: {
                            smith: {
                                id: "smith",
                                label: "Smith",
                                description: "",
                                summary: "",
                                type: "profession",
                                excludes: [],
                                effects: [
                                    {
                                        type: "add_producer_output_multiplier",
                                        producerTag: "artisan",
                                        amount: 0.25,
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
                    path="config.habiti.smith.effects.0"
                    index={0}
                    onDelete={() => undefined}
                />
            </ThemeProvider>,
        );
        expect(screen.getByText("Producer Tag")).toBeDefined();
    });
});
