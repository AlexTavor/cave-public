// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { createCartridge } from "../../../../../engine/test/factories";
import { BlueprintConfigSchema } from "../../../../../data/schemas/blueprintConfig";
import { useSessionStore } from "../../../state/useSessionStore";
import { TutorialsEditor } from "./TutorialsEditor";

const filename = "modules/core.cave";

describe("TutorialsEditor", () => {
    beforeEach(() => {
        const module = createCartridge(filename);
        module.config = BlueprintConfigSchema.parse({
            settings: {
                guidances: [
                    {
                        id: "intro_modal",
                        presentation: "modal",
                        title: "Intro",
                        text: "Wake up.",
                    },
                    {
                        id: "second_modal",
                        presentation: "modal",
                        title: "Second",
                        text: "Stay awake.",
                    },
                ],
                tutorials: [
                    {
                        id: "intro",
                        selfDefinition: { kind: "auto" },
                        guidances: [{ guidanceId: "intro_modal" }],
                    },
                    {
                        id: "second",
                        selfDefinition: { kind: "auto" },
                        guidances: [{ guidanceId: "second_modal" }],
                    },
                ],
            },
        });
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, module);
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("adds tutorials and supports self-definition and override wiring", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <TutorialsEditor filename={filename} />
                </PortalManager>
            </ThemeProvider>,
        );

        expect(screen.getByText("intro")).toBeDefined();
        fireEvent.click(screen.getByText("intro"));
        fireEvent.change(screen.getAllByDisplayValue("auto")[0], {
            target: { value: "spawned_with_tag" },
        });
        fireEvent.click(screen.getByText("+ Add Tutorial"));
        fireEvent.click(screen.getAllByText("+ Add Guidance")[0]);
        fireEvent.click(screen.getAllByText("Enable Target Override")[0]);
        const tutorials = useSessionStore.getState().sessions[filename]?.draft
            .config?.settings?.tutorials as any[];
        expect(tutorials).toHaveLength(3);
        expect(tutorials[0].guidances).toHaveLength(2);
        expect(tutorials[0].selfDefinition.kind).toBe("spawned_with_tag");
        expect(tutorials[0].guidances[0].targetOverride.kind).toBe("entity_id");
        expect(tutorials[2].guidances).toHaveLength(0);
    });

    it("rejects duplicate renames and keeps the current draft values", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <TutorialsEditor filename={filename} />
                </PortalManager>
            </ThemeProvider>,
        );

        fireEvent.doubleClick(screen.getByText("intro"));
        fireEvent.change(screen.getByDisplayValue("intro"), {
            target: { value: "second" },
        });
        fireEvent.blur(screen.getByDisplayValue("second"));
        fireEvent.click(screen.getByText("intro"));
        expect(
            (
                useSessionStore.getState().sessions[filename]?.draft.config
                    ?.settings?.tutorials as any[]
            )[0].id,
        ).toBe("intro");
    });
});
