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

const initSession = () =>
    useSessionStore.getState().initSession(
        "test.json",
        createCartridge("test.json", {
            blueprints: {
                worker: createBlueprint("worker", {
                    _editor: { abilities: { passport: { label: "Worker" } } },
                }),
            },
        }),
    );

const renderForm = () =>
    render(
        <ThemeProvider>
            <BlueprintProvider
                value={{ filename: "test.json", blueprintId: "worker" }}
            >
                <PassportAbilityForm rootPath="blueprints.worker" />
            </BlueprintProvider>
        </ThemeProvider>,
    );

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
});

describe("PassportAbilityForm permanent", () => {
    it("defaults the permanent toggle to unchecked", () => {
        initSession();
        renderForm();

        expect(
            (screen.getByLabelText("Permanent") as HTMLInputElement).checked,
        ).toBe(false);
    });

    it("persists the permanent toggle", () => {
        initSession();
        renderForm();

        fireEvent.click(screen.getByLabelText("Permanent"));
        expect(
            useSessionStore.getState().sessions["test.json"]?.draft.blueprints
                .worker._editor?.abilities?.passport?.permanent,
        ).toBe(true);
    });
});
