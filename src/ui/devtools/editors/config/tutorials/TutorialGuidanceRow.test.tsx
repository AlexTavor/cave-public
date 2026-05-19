// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../engine/test/factories";
import { BlueprintConfigSchema } from "../../../../../data/schemas/blueprintConfig";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { TutorialGuidanceRow } from "./TutorialGuidanceRow";

const filename = "modules/core.cave";

describe("TutorialGuidanceRow", () => {
    beforeEach(() => {
        const module = createCartridge(filename);
        module.config = BlueprintConfigSchema.parse({
            settings: {
                guidances: [
                    {
                        id: "intro_modal",
                        presentation: "modal",
                        title: "Intro",
                        text: "Body",
                    },
                    {
                        id: "draft_pick",
                        presentation: "draft_guidance",
                        targetOptionId: "opt_a",
                    },
                ],
                tutorials: [
                    { id: "intro", guidances: [{ guidanceId: "intro_modal" }] },
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

    it("normalizes target override payloads into a valid discriminated union", async () => {
        render(
            <ThemeProvider>
                <TutorialGuidanceRow
                    filename={filename}
                    path="config.settings.tutorials.0.guidances.0"
                    guidanceIds={["intro_modal"]}
                    onRemove={() => undefined}
                />
            </ThemeProvider>,
        );

        const titleOverride = screen.getByLabelText("Title Override");
        fireEvent.change(titleOverride, {
            target: { value: "Urgent" },
        });
        fireEvent.blur(titleOverride);
        fireEvent.click(screen.getByText("Enable Target Override"));
        fireEvent.change(screen.getByDisplayValue("entity_id"), {
            target: { value: "entity_tag" },
        });
        const guidance = (
            useSessionStore.getState().sessions[filename]?.draft.config
                ?.settings?.tutorials as any[]
        )[0].guidances[0].targetOverride;
        expect(guidance.kind).toBe("entity_tag");
        expect(guidance.tag).toBeTruthy();
        await waitFor(() => {
            expect(
                (
                    useSessionStore.getState().sessions[filename]?.draft.config
                        ?.settings?.tutorials as any[]
                )[0].guidances[0].titleOverride,
            ).toBe("Urgent");
        });
    });
    it("hides invalid override controls for draft_guidance and clears stale values", async () => {
        useSessionStore.getState().updateDraft(filename, (draft) => {
            const row = (draft.config?.settings?.tutorials as any[])[0]
                .guidances[0];
            row.textOverride = "stale";
            row.targetOverride = { kind: "entity_id", entityId: "sys_world" };
        });

        render(
            <ThemeProvider>
                <TutorialGuidanceRow
                    filename={filename}
                    path="config.settings.tutorials.0.guidances.0"
                    guidanceIds={["intro_modal", "draft_pick"]}
                    onRemove={() => undefined}
                />
            </ThemeProvider>,
        );

        const guidanceId = screen.getByDisplayValue("intro_modal");
        fireEvent.change(guidanceId, {
            target: { value: "draft_pick" },
        });
        fireEvent.blur(guidanceId);
        await waitFor(() => {
            expect(screen.queryByText("Text Override")).toBeNull();
            expect(screen.queryByText("Enable Target Override")).toBeNull();
        });
        const row = (
            useSessionStore.getState().sessions[filename]?.draft.config
                ?.settings?.tutorials as any[]
        )[0].guidances[0];
        expect(row.textOverride).toBeUndefined();
        expect(row.targetOverride).toBeUndefined();
    });
});
