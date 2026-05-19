// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { createCartridge } from "../../../../../engine/test/factories";
import { TraitModifiersSection } from "./TraitModifiersSection";

const filename = "modules/core.cave";
const basePath = "config.traits.t1.modifiers";

describe("TraitModifiersSection", () => {
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

    it("renders section header with add button", () => {
        render(
            <ThemeProvider>
                <TraitModifiersSection
                    filename={filename}
                    basePath={basePath}
                />
            </ThemeProvider>,
        );

        expect(screen.getByText("Modifiers")).toBeDefined();
        expect(screen.getByText("+ Add")).toBeDefined();
    });

    it("adds a modifier row on click", () => {
        render(
            <ThemeProvider>
                <TraitModifiersSection
                    filename={filename}
                    basePath={basePath}
                />
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByText("+ Add"));

        expect(screen.getByText("Operation")).toBeDefined();
        expect(screen.getByText("Target")).toBeDefined();
        expect(screen.getByText("Remove")).toBeDefined();
    });
});

