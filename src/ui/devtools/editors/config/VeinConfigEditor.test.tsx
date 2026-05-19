// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { VeinConfigEditor } from "./VeinConfigEditor";

let storeData: Record<string, unknown> = {};

vi.mock("../../state/useSessionStore", () => ({
    useSessionStore: (sel: (s: any) => any) =>
        sel({
            sessions: { "test.cave": { draft: storeData } },
            updateDraft: vi.fn(),
        }),
}));

afterEach(() => {
    cleanup();
});

const renderEditor = () =>
    render(
        <ThemeProvider>
            <VeinConfigEditor filename="test.cave" />
        </ThemeProvider>,
    );

describe("VeinConfigEditor", () => {
    it("renders the vein JSON subtree including the new geometry fields", () => {
        storeData = {
            assets: {
                settings: {
                    vein_network: {
                        geometry: {
                            waviness_simplex_scale: 2,
                            meander: { point_count_min: 1 },
                        },
                    },
                },
            },
        };
        renderEditor();
        const value = (
            screen.getByRole("textbox") as unknown as HTMLInputElement
        ).value;
        expect(value).toContain("waviness_simplex_scale");
        expect(value).toContain("point_count_min");
    });

    it("still reads from assets.settings.vein_network", () => {
        storeData = {
            config: { settings: { vein_network: { marker: "wrong" } } },
            assets: { settings: { vein_network: { marker: "right" } } },
        };
        renderEditor();
        const value = (
            screen.getByRole("textbox") as unknown as HTMLInputElement
        ).value;
        expect(value).toContain('"right"');
    });
});
