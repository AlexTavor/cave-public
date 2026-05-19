// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { BlueprintProvider } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { PassportAbilityForm } from "./PassportAbilityForm";

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
});

describe("PassportAbilityForm nervous vein", () => {
    it("persists the nervous vein toggle", () => {
        useSessionStore
            .getState()
            .initSession(
                "test.json",
                createCartridge("test.json", {
                    blueprints: {
                        worker: createBlueprint("worker", {
                            _editor: {
                                abilities: { passport: { label: "Worker" } },
                            },
                        }),
                    },
                }),
            );
        render(
            <ThemeProvider>
                <BlueprintProvider
                    value={{ filename: "test.json", blueprintId: "worker" }}
                >
                    <PassportAbilityForm rootPath="blueprints.worker" />
                </BlueprintProvider>
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByLabelText("Nervous Vein"));
        expect(
            useSessionStore.getState().sessions["test.json"]?.draft.blueprints
                .worker._editor?.abilities?.passport?.nervousVein,
        ).toBe(true);
    });
});
