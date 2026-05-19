// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { createCartridge } from "../../../../../engine/test/factories";
import { TraitModifierRow } from "./TraitModifierRow";

const filename = "modules/core.cave";
const basePath = "config.traits.t1.modifiers.0";

describe("TraitModifierRow", () => {
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

    it("renders all four fields", () => {
        render(
            <ThemeProvider>
                <TraitModifierRow filename={filename} basePath={basePath} />
            </ThemeProvider>,
        );

        expect(screen.getByText("Operation")).toBeDefined();
        expect(screen.getByText("Target")).toBeDefined();
        expect(screen.getByText("Source (optional)")).toBeDefined();
        expect(screen.getByText("Value (optional)")).toBeDefined();
    });
});

