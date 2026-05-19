// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { createCartridge } from "../../../../../engine/test/factories";
import { BlueprintConfigSchema } from "../../../../../data/schemas/blueprintConfig";
import { useSessionStore } from "../../../state/useSessionStore";
import { GuidancesEditor } from "../guidances/GuidancesEditor";

const filename = "modules/core.cave";

describe("GuidancesEditor", () => {
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
            },
        });
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, module);
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders guidances from config and adds a new one", () => {
        render(
            <ThemeProvider>
                <GuidancesEditor filename={filename} />
            </ThemeProvider>,
        );

        expect(screen.getByText("intro")).toBeDefined();
        fireEvent.click(screen.getByText("+ Add Guidance"));
        expect(
            useSessionStore.getState().sessions[filename]?.draft.config
                ?.settings?.guidances,
        ).toHaveLength(2);
    });
});
