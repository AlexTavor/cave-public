// @vitest-environment jsdom
import React from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { useModuleStore } from "../state/moduleStore";
import { useTerminalStore } from "../state/useTerminalStore";
import { fileCache } from "../../../engine/terminal/fileUtils";
import { useGameTerminal } from "./useGameTerminal";
import {
    createCartridge,
    createImpulseConfig,
} from "../../../engine/test/factories";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { DEFAULT_VEIN_CONFIG } from "../../../data/schemas/assets";

const baseModule: ModuleCartridge = createCartridge("game.json", {
    metadata: {
        id: "game.json",
        name: "Game",
        version: "0.0.1",
    },
    assets: {
        displays: {
            wraith: {
                type: "resource",
                styleId: "spirit",
                glyphKey: "ghost",
            },
        },
        resources: {},
        traits: {},
        settings: {
            impulse: createImpulseConfig(),
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

const TestHarness: React.FC = () => {
    const { input, suggestions, onChange } = useGameTerminal([]);

    return (
        <div>
            <input
                aria-label="terminal-input"
                value={input}
                onChange={(e) => onChange(e.target.value)}
            />
            <ul>
                {suggestions.map((s) => (
                    <li key={s.label}>{s.label}</li>
                ))}
            </ul>
        </div>
    );
};

describe("ui/devtools/terminal/AutocompleteFlow", () => {
    const originalCache = [...fileCache];

    beforeEach(() => {
        useTerminalStore.setState({
            logs: [],
            input: "",
            commandHistory: [],
            historyIndex: -1,
        });

        useModuleStore.setState((state) => ({
            ...state,
            modules: { "game.json": baseModule },
        }));

        fileCache.length = 0;
        fileCache.push("game.json");
    });

    afterEach(() => {
        cleanup();
        useModuleStore.setState((state) => ({
            ...state,
            modules: {},
            indexes: {},
        }));
        fileCache.length = 0;
        fileCache.push(...originalCache);
    });

    it("suggests files for file-based commands", () => {
        render(<TestHarness />);

        fireEvent.change(screen.getByLabelText("terminal-input"), {
            target: { value: "cat game" },
        });

        expect(screen.getByText("game.json")).toBeDefined();
    });
});

