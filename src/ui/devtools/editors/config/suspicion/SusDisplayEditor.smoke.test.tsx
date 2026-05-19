// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../engine/test/factories";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { SusDisplayEditor } from "./SusDisplayEditor";

const filename = "modules/core.cave";

describe("SusDisplayEditor", () => {
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

    it("renders add and remove affordances without crashing", () => {
        render(
            <ThemeProvider>
                <SusDisplayEditor filename={filename} />
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByText("+ Add Sus Display"));
        fireEvent.click(screen.getByText("+ Add Sus Display"));
        expect(screen.getByText("Display 1")).toBeTruthy();
        fireEvent.click(screen.getByText("Display 2"));
        expect(screen.getAllByText("Remove Display")).toHaveLength(2);
        expect(screen.getAllByLabelText("Color")).toHaveLength(2);
    });
});
