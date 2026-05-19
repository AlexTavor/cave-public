// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { BlueprintProvider } from "../../BlueprintContext";
import { useModuleStore } from "../../../../state/moduleStore";
import { useSessionStore } from "../../../../state/useSessionStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { PassportAbilityForm } from "./PassportAbilityForm";

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

describe("PassportAbilityForm parent field", () => {
    it("adds, switches, and removes the optional parent row", () => {
        useModuleStore.setState({ modules: {} } as any);
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            "test.json",
            createCartridge("test.json", {
                blueprints: {
                    worker: createBlueprint("worker", {
                        tags: ["worker", "nest"],
                        components: {},
                        _editor: {
                            abilities: { passport: { label: "Worker" } },
                        },
                    }),
                    nest: createBlueprint("nest", {
                        tags: ["nest"],
                        components: {},
                    }),
                },
            }),
        );
        useSessionStore
            .getState()
            .initSession(
                "assets.art",
                createCartridge("assets.art", { assets: { displays: {} } }),
            );

        renderForm();
        fireEvent.click(screen.getByText("Add Parent"));
        fireEvent.change(screen.getByDisplayValue("entity_tag"), {
            target: { value: "entity_id" },
        });
        const parentIdInput = screen
            .getByText("Parent ID")
            .parentElement?.querySelector("input");
        if (!(parentIdInput instanceof HTMLInputElement)) {
            throw new TypeError("Expected Parent ID input");
        }
        fireEvent.change(parentIdInput, {
            target: { value: "root-1" },
        });
        fireEvent.blur(parentIdInput);

        const parent =
            useSessionStore.getState().sessions["test.json"]?.draft.blueprints
                ?.worker?._editor?.abilities?.passport?.parent;
        expect(parent).toEqual({ kind: "entity_id", entityId: "root-1" });

        fireEvent.click(screen.getByText("Remove Parent"));
        expect(
            useSessionStore.getState().sessions["test.json"]?.draft.blueprints
                ?.worker?._editor?.abilities?.passport?.parent,
        ).toBeUndefined();
    });
});
