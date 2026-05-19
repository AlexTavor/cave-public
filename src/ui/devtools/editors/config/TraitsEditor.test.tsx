// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../state/useSessionStore";
import { createCartridge } from "../../../../engine/test/factories";
import { TraitsEditor } from "./TraitsEditor";

const filename = "modules/core.cave";

describe("TraitsEditor", () => {
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

    it("renders the tool frame title", () => {
        render(
            <ThemeProvider>
                <TraitsEditor filename={filename} />
            </ThemeProvider>,
        );

        expect(screen.getByText("Global Traits")).toBeDefined();
    });

    it("shows empty state message when no traits", () => {
        render(
            <ThemeProvider>
                <TraitsEditor filename={filename} />
            </ThemeProvider>,
        );

        expect(screen.getByText("No traits defined yet.")).toBeDefined();
    });

    it("shows add trait button", () => {
        render(
            <ThemeProvider>
                <TraitsEditor filename={filename} />
            </ThemeProvider>,
        );

        expect(screen.getByText("+ Add Trait")).toBeDefined();
    });
});
