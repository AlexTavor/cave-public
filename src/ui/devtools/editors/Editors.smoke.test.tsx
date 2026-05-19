// @vitest-environment jsdom
import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { useSessionStore } from "../state/useSessionStore";
import { createSession } from "../state/sessionLogic";
import { createCartridge } from "../../../engine/test/factories";
import { WorldEntityEditor } from "./config/WorldEntityEditor";
import { SystemConfigEditor } from "./file/SystemConfigEditor";

const FILENAME = "test.cave";

const wrap = (ui: React.ReactElement) => (
    <ThemeProvider>
        <PortalManager>{ui}</PortalManager>
    </ThemeProvider>
);

beforeEach(() => {
    const cartridge = createCartridge(FILENAME);
    useSessionStore.setState({
        sessions: {
            [FILENAME]: createSession(FILENAME, cartridge),
        },
    });
});

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
});

describe("Editors Smoke Tests", () => {
    it("SystemConfigEditor mounts without crashing", () => {
        const { container } = render(
            wrap(<SystemConfigEditor filename={FILENAME} />),
        );
        expect(container).toBeDefined();
    });

    it("WorldEntityEditor mounts without crashing", () => {
        const { container } = render(
            wrap(<WorldEntityEditor filename={FILENAME} />),
        );
        expect(container).toBeDefined();
    });
});
