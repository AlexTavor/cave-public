// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../engine/test/factories";
import { getByPath } from "../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { SuspicionNotificationDisplayEditor } from "./SuspicionNotificationDisplayEditor";

const filename = "modules/core.cave";
const path = "config.settings.game_config.suspicionNotificationDisplays.0.text";

describe("SuspicionNotificationDisplayEditor", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore
            .getState()
            .initSession(filename, createCartridge(filename));
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders add and remove affordances and binds rows to suspicionNotificationDisplays", () => {
        render(
            <ThemeProvider>
                <SuspicionNotificationDisplayEditor filename={filename} />
            </ThemeProvider>,
        );
        fireEvent.click(
            screen.getByText("+ Add Suspicion Notification Display"),
        );
        expect(screen.getByText("Display 1")).toBeTruthy();
        expect(screen.getAllByLabelText("Color")).toHaveLength(1);
        fireEvent.change(screen.getByLabelText("Text"), {
            target: { value: "High" },
        });
        fireEvent.blur(screen.getByLabelText("Text"));
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                path,
            ),
        ).toBe("High");
        expect(
            getByPath(
                useSessionStore.getState().sessions[filename]?.draft,
                "config.settings.game_config.susDisplays.0.text",
            ),
        ).toBeUndefined();
        fireEvent.click(screen.getByText("Remove Display"));
    });
});
