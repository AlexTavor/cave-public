// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../engine/test/factories";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { useSessionStore } from "../../../state/useSessionStore";
import { ConditionsEditor } from "./ConditionsEditor";

const filename = "modules/core.cave";

describe("ConditionsEditor", () => {
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

    it("renders with no authored condition definitions", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <ConditionsEditor filename={filename} />
                </PortalManager>
            </ThemeProvider>,
        );

        expect(screen.getByText("Conditions Editor")).toBeDefined();
        expect(screen.getByText("+ Add Condition")).toBeDefined();
    });
});
