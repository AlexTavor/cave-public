// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { createCartridge } from "../../../../../engine/test/factories";
import { BlueprintConfigSchema } from "../../../../../data/schemas/blueprintConfig";
import { useSessionStore } from "../../../state/useSessionStore";
import { TutorialForm } from "./TutorialForm";

const filename = "modules/core.cave";

describe("TutorialForm", () => {
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
                ],
                tutorials: [
                    {
                        id: "intro",
                        selfDefinition: { kind: "auto" },
                        guidances: [{ guidanceId: "intro_modal" }],
                    },
                ],
            },
        });
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, module);
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(((
            fn: FrameRequestCallback,
        ) => {
            fn(0);
            return 1;
        }) as any);
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
        vi.restoreAllMocks();
    });

    it("renders onComplete actions and stores authored action text", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <TutorialForm
                        filename={filename}
                        index={0}
                        onRemove={() => undefined}
                        onRename={() => null}
                    />
                </PortalManager>
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByText("intro"));
        expect(screen.getByText("On Complete")).toBeDefined();
        fireEvent.change(
            screen.getByPlaceholderText(/SET self.state.hp.value 5/i),
            { target: { value: "SET global.tutorial_mode 0" } },
        );
        fireEvent.click(screen.getByText("Add"));

        expect(
            (
                useSessionStore.getState().sessions[filename]?.draft.config
                    ?.settings?.tutorials as any[]
            )[0].onComplete,
        ).toMatchObject([
            {
                type: "MUTATE",
                target: "global.tutorial_mode",
                op: "SET",
                value: 0,
            },
        ]);
    });
});
