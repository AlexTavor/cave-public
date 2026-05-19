// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ModuleCartridge } from "../../../../data/schemas/module";
import { useBehaviorSuggestions } from "./useBehaviorSuggestions";
import { useShellStore } from "../../shell/shell";
import { useModuleStore } from "../../state/moduleStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../engine/test/factories";

const filename = "game.json";

const baseModule: ModuleCartridge = createCartridge(filename, {
    metadata: { id: filename, name: "Game", version: "0.0.1" },
    blueprints: {
        entity_alpha: createBlueprint("entity_alpha", { components: {} }),
        entity_beta: createBlueprint("entity_beta", { components: {} }),
    },
});

afterEach(() => {
    useShellStore.setState({
        activeFilePath: null,
        activeModuleFilename: null,
    });
    useModuleStore.setState({
        modules: {},
        indexes: {},
        loading: {},
        loadOrder: [],
        loadModule: vi.fn(async () => {}),
    } as unknown as ReturnType<typeof useModuleStore.getState>);
});

beforeEach(() => {
    useModuleStore.setState({
        modules: { [filename]: baseModule },
        indexes: {},
        loading: {},
        loadOrder: [],
        loadModule: vi.fn(async () => {}),
    } as unknown as ReturnType<typeof useModuleStore.getState>);
});

describe("useBehaviorSuggestions", () => {
    it("returns verb suggestions for empty input", () => {
        const { result } = renderHook(() => useBehaviorSuggestions(""));
        expect(result.current.map((s) => s.label)).toEqual(["WHEN"]);
    });

    it("returns entity suggestions for matching prefix", () => {
        useShellStore.setState({
            activeFilePath: `module::${filename}`,
            activeModuleFilename: filename,
        });

        const { result } = renderHook(() =>
            useBehaviorSuggestions("WHEN entity_"),
        );

        expect(result.current.map((s) => s.label)).toEqual([
            "entity_alpha",
            "entity_beta",
        ]);
    });
});
