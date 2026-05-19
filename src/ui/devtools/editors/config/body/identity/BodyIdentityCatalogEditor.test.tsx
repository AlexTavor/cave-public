// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCartridge } from "../../../../../../engine/test/factories";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../../state/useSessionStore";
import { BodyIdentityCatalogEditor } from "./BodyIdentityCatalogEditor";

vi.mock("../../../../../lib/atoms/tooltip", () => ({
    SmartTooltip: ({ children, content }: any) => (
        <span data-tooltip={content}>{children}</span>
    ),
}));

describe("BodyIdentityCatalogEditor", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            "test.cave",
            createCartridge("test.cave", {
                config: {
                    habiti: {
                        human: {
                            id: "human",
                            label: "Human",
                            type: "species",
                            effects: [],
                            excludes: [],
                        },
                        woman: {
                            id: "woman",
                            label: "Woman",
                            type: "gender",
                            effects: [],
                            excludes: [],
                        },
                    },
                },
            }),
        );
    });
    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("renders registry-derived identity groups and no editable taxonomy fields", () => {
        render(
            <ThemeProvider>
                <BodyIdentityCatalogEditor filename="test.cave" />
            </ThemeProvider>,
        );
        expect(Boolean(screen.getByText("species"))).toBe(true);
        expect(Boolean(screen.getByText("human"))).toBe(true);
        expect(screen.queryByLabelText("Species")).toBeNull();
    });
});
