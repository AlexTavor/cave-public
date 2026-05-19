// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { useSessionStore } from "../../state/useSessionStore";
import { createCartridge } from "../../../../engine/test/factories";
import { ConditionReferenceList } from "./ConditionReferenceList";

const filename = "modules/core.cave";
const path = "config.settings.tutorials.0.enterConditionIds";

describe("ConditionReferenceList", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                config: {
                    settings: {
                        conditions: [
                            {
                                id: "game_started",
                                label: "Game Started",
                                conditions: [],
                            },
                        ],
                        tutorials: [{ id: "intro", guidances: [] }],
                    },
                },
            }) as any,
        );
    });
    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("drops unfinished blank refs on blur instead of saving empty strings", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <ConditionReferenceList
                        filename={filename}
                        path={path}
                        label="Enter Conditions"
                    />
                </PortalManager>
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByText("+ Add Condition Ref"));
        fireEvent.blur(screen.getByDisplayValue(""));
        expect(
            (
                useSessionStore.getState().sessions[filename]?.draft.config
                    ?.settings?.tutorials as any[]
            )[0].enterConditionIds ?? [],
        ).toEqual([]);
    });
});
