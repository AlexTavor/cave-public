// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../engine/test/factories";
import { BlueprintConfigSchema } from "../../../../../data/schemas/blueprintConfig";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { useSessionStore } from "../../../state/useSessionStore";
import { KnowledgeEditor } from "./KnowledgeEditor";

const filename = "modules/core.cave";

describe("KnowledgeEditor", () => {
    beforeEach(() => {
        const module = createCartridge(filename);
        module.config = BlueprintConfigSchema.parse({
            settings: {
                guidances: [
                    {
                        id: "intro",
                        presentation: "modal",
                        title: "Intro",
                        text: "Wake up.",
                    },
                ],
                knowledge: [
                    {
                        id: "codex_1",
                        label: "Intro",
                        description: "Desc",
                        guidanceId: "intro",
                        unlockConditionIds: [],
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

    it("adds codex rows and toggles optional target overrides", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <KnowledgeEditor filename={filename} />
                </PortalManager>
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByText("+ Add Codex Entry"));
        fireEvent.click(screen.getByText("codex_2"));
        fireEvent.click(screen.getAllByText("Enable Target Override")[0]);
        expect(screen.getByText("Target Override Kind")).toBeDefined();
    });
});
