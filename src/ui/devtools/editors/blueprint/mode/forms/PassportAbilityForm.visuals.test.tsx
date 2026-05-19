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

describe("PassportAbilityForm visuals", () => {
    it("opens the visuals modal state for non-body blueprints", () => {
        useModuleStore.setState({ modules: {} } as any);
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            "test.json",
            createCartridge("test.json", {
                blueprints: {
                    worker: createBlueprint("worker", {
                        components: {},
                        _editor: {
                            abilities: {
                                passport: { label: "Worker", icon: "worker" },
                            },
                        },
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
        render(
            <ThemeProvider>
                <BlueprintProvider
                    value={{ filename: "test.json", blueprintId: "worker" }}
                >
                    <PassportAbilityForm rootPath="blueprints.worker" />
                </BlueprintProvider>
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByText("Edit Visuals"));
        expect(
            useSessionStore.getState().sessions["test.json"]?.ui?.[
                "blueprint:worker"
            ]?.isVisualsOpen,
        ).toBe(true);
    });
});
