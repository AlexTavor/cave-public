// @vitest-environment jsdom
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { MenuAmbientRuntime } from "./MenuAmbientRuntime";
import { buildMenuAmbientRuntime } from "./buildMenuAmbientRuntime";
import { loadMenuAmbientConfig } from "./loadMenuAmbientConfig";

vi.mock("./loadMenuAmbientConfig", () => ({
    loadMenuAmbientConfig: vi.fn(async () => DEFAULT_GAME_CONFIG.menuAmbient),
}));

vi.mock("./buildMenuAmbientRuntime", () => ({
    buildMenuAmbientRuntime: vi.fn(() => ({
        tick: vi.fn(),
        destroy: vi.fn(),
        getState: () => ({ tick: 3 }),
    })),
}));

vi.mock("../shell/RuntimeShellCanvas", async () => {
    const React = await import("react");
    const { WorldInteractionContext } =
        await import("../world/context/WorldInteractionContext");
    return {
        RuntimeShellCanvas: () => {
            const world = React.useContext(WorldInteractionContext);
            const [seen, setSeen] = React.useState(0);
            React.useEffect(() => {
                if (world?.runtime) setSeen((current) => current + 1);
            }, [world?.runtime]);
            return <div data-testid="ambient-shell">{seen}</div>;
        },
    };
});

describe("MenuAmbientRuntime", () => {
    it("does not trigger render-phase update warnings when the manifest changes", async () => {
        const errorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        const { rerender, unmount } = render(
            <React.StrictMode>
                <MenuAmbientRuntime manifestPath="example/manifest.json" />
            </React.StrictMode>,
        );

        await waitFor(() => expect(loadMenuAmbientConfig).toHaveBeenCalled());
        rerender(
            <React.StrictMode>
                <MenuAmbientRuntime manifestPath="example/other-manifest.json" />
            </React.StrictMode>,
        );
        await waitFor(() =>
            expect(buildMenuAmbientRuntime).toHaveBeenCalledWith(
                DEFAULT_GAME_CONFIG.menuAmbient,
                "menu-ambient:example/other-manifest.json",
            ),
        );
        unmount();

        expect(errorSpy.mock.calls.flat().join("\n")).not.toContain(
            "Cannot update a component",
        );
    });
});
