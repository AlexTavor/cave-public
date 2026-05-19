// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../lib/foundation/icon-registry/IconRegistryProvider";
import { createGameRuntime } from "../../../engine/runtime/createGameRuntime";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../../data/schemas/assets";
import { SelectionOverlay } from "./SelectionOverlay";
import { TestWorldInteractionProvider } from "./testUtils";

const makeModule = (): ModuleCartridge => ({
    metadata: { id: "test", name: "Test", version: "0.0.1" },
    blueprints: {},
    assets: {
        displays: {},
        icons: {},
        resources: {},
        styles: {},
        traits: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

const renderOverlay = (selectedEntityId: string | null) => {
    const runtime = createGameRuntime(makeModule(), "seed");
    runtime.addEntity({
        id: "worker-1",
        label: "Worker",
        body: {
            xp: 10,
            xpRate: 1,
            level: 2,
            baseAttributes: { body: 1, mind: 1, social: 1 },
            attributes: { body: 2, mind: 1, social: 1 },
            passport: { name: "Ada" },
            traits: [],
        },
    });
    runtime.addEntity({
        id: "parent-1",
        label: "Hommlet",
        display: { label: "Hommlet", description: "Village node." },
    });
    runtime.addEntity({
        id: "child-1",
        label: "Daylabor",
        display: { label: "Daylabor" },
        parent: { parentId: "parent-1" },
        powerSink: {
            throttle: 0.4,
            allocatedDraw: { body: 1, mind: 0, social: 0 },
        },
    });

    return render(
        <ThemeProvider>
            <IconRegistryProvider>
                <TestWorldInteractionProvider
                    value={{ runtime, selectedEntityId }}
                >
                    <SelectionOverlay />
                </TestWorldInteractionProvider>
            </IconRegistryProvider>
        </ThemeProvider>,
    );
};

afterEach(() => {
    cleanup();
});

describe("SelectionOverlay", () => {
    it("renders nothing when selection is null", () => {
        renderOverlay(null);
        expect(screen.queryByText("Kill")).toBeNull();
    });

    it("renders body card when a body is selected", () => {
        renderOverlay("worker-1");
        expect(screen.getByText(/Ada/)).toBeDefined();
    });

    it("renders a display fallback lens for display-only parent nodes", () => {
        renderOverlay("parent-1");
        expect(screen.getByText("Hommlet")).toBeDefined();
        expect(screen.getByText("Village node.")).toBeDefined();
    });
});

