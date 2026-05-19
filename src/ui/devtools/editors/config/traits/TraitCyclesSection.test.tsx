// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { createCartridge } from "../../../../../engine/test/factories";
import { TraitCyclesSection } from "./TraitCyclesSection";

const filename = "modules/core.cave";
const basePath = "config.traits.t1.cycles";

describe("TraitCyclesSection", () => {
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

    it("renders section header with add cycle button", () => {
        render(
            <ThemeProvider>
                <TraitCyclesSection filename={filename} basePath={basePath} />
            </ThemeProvider>,
        );

        expect(screen.getByText("Cycles")).toBeDefined();
        expect(screen.getByText("+ Add Cycle")).toBeDefined();
    });

    it("adds a cycle row on click", () => {
        render(
            <ThemeProvider>
                <TraitCyclesSection filename={filename} basePath={basePath} />
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByText("+ Add Cycle"));

        expect(screen.getByText("Cycle 1")).toBeDefined();
    });
});

