// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { getByPath } from "../../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { ConditionalActivationAbilityForm } from "./ConditionalActivationAbilityForm";

const filename = "game.json";

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
});

describe("ConditionalActivationAbilityForm explanation", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                blueprints: {
                    worker: createBlueprint("worker", {
                        _editor: {
                            abilities: {
                                cycle: {
                                    maxProgress: {
                                        base: 1,
                                        perBody: 0,
                                        multPerBody: 0,
                                    },
                                    costMultPerCycle: 0,
                                    inputs: {},
                                    oneOff: false,
                                    conditions: [],
                                },
                                conditionalActivation: [
                                    {
                                        priority: 0,
                                        conditions: [],
                                        targets: [],
                                    },
                                ],
                            },
                        },
                    }),
                },
            }),
        );
    });

    it("renders and persists the inactive explanation field", () => {
        render(
            <ThemeProvider>
                <BlueprintProvider value={{ filename, blueprintId: "worker" }}>
                    <ConditionalActivationAbilityForm basePath="blueprints.worker._editor.abilities.conditionalActivation.0" />
                </BlueprintProvider>
            </ThemeProvider>,
        );
        const input = document.querySelector("textarea") as HTMLTextAreaElement;
        const priorityInput = document.querySelector(
            'input[type="number"]',
        ) as HTMLInputElement;
        fireEvent.change(input, { target: { value: "Need more workers." } });
        fireEvent.blur(input);
        fireEvent.change(priorityInput, { target: { value: "4" } });
        fireEvent.blur(priorityInput);
        expect(screen.getByText("Inactive Explanation")).toBeTruthy();
        expect(input.value).toBe("Need more workers.");
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                "blueprints.worker._editor.abilities.conditionalActivation.0.inactiveExplanation",
            ),
        ).toBe("Need more workers.");
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                "blueprints.worker._editor.abilities.conditionalActivation.0.priority",
            ),
        ).toBe(4);
    });
});
