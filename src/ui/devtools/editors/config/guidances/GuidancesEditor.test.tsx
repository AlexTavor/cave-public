// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../engine/test/factories";
import { BlueprintConfigSchema } from "../../../../../data/schemas/blueprintConfig";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { useSessionStore } from "../../../state/useSessionStore";
import { GuidancesEditor } from "./GuidancesEditor";

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

    it("switches subtype fields and mounts the embedded preview", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <GuidancesEditor filename={filename} />
                </PortalManager>
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByRole("button", { name: /intro/i }));
        fireEvent.change(screen.getByDisplayValue("modal"), {
            target: { value: "node_callout" },
        });
        expect(screen.getByText("Target Kind")).toBeDefined();
        expect(screen.queryByText("Screen Slot")).toBeNull();
    });

    it("shows draft_guidance option targeting and hides visual-only fields", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <GuidancesEditor filename={filename} />
                </PortalManager>
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByRole("button", { name: /intro/i }));
        const presentation = screen.getAllByRole("combobox")[0];
        fireEvent.change(presentation, {
            target: { value: "draft_guidance" },
        });
        fireEvent.blur(presentation);
        expect(screen.getByText("Target Option ID")).toBeDefined();
        expect(screen.queryByText("Text")).toBeNull();
        expect(screen.queryByText("Title")).toBeNull();
        expect(screen.queryByText("Image URL")).toBeNull();
    });
});
