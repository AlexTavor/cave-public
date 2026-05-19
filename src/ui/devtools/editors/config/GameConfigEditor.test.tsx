// @vitest-environment jsdom
import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { useSessionStore } from "../../state/useSessionStore";
import { createSession } from "../../state/sessionLogic";
import { createCartridge } from "../../../../engine/test/factories";
import { GameConfigEditor } from "./GameConfigEditor";

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

describe("GameConfigEditor", () => {
    it("renders without crashing", () => {
        const { container } = render(
            wrap(<GameConfigEditor filename={FILENAME} />),
        );
        expect(container).toBeDefined();
    });
});
