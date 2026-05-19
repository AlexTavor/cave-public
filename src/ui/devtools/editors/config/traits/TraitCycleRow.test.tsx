// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { createCartridge } from "../../../../../engine/test/factories";
import { TraitCycleRow } from "./TraitCycleRow";

const filename = "modules/core.cave";
const basePath = "config.traits.t1.cycles.0";

describe("TraitCycleRow", () => {
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

    it("renders cycle header without crashing", () => {
        render(
            <ThemeProvider>
                <TraitCycleRow
                    filename={filename}
                    basePath={basePath}
                    index={0}
                    onRemove={() => {}}
                />
            </ThemeProvider>,
        );

        expect(screen.getByText("Cycle 1")).toBeDefined();
        expect(screen.getByText("Periodic effect")).toBeDefined();
    });
});

