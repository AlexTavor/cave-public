// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import { useBehaviorAutocomplete } from "./useBehaviorAutocomplete";
import { useShellStore } from "../../../shell/shell";
import { useModuleStore } from "../../../state/moduleStore";
import { useSessionStore } from "../../../state/useSessionStore";
import { BlueprintProvider } from "../../blueprint/BlueprintContext";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";

const filename = "game.json";
const blueprintId = "entity_alpha";

const baseModule: ModuleCartridge = createCartridge(filename, {
    metadata: { id: filename, name: "Game", version: "0.0.1" },
    blueprints: {
        entity_alpha: createBlueprint("entity_alpha", { components: {} }),
        entity_beta: createBlueprint("entity_beta", { components: {} }),
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BlueprintProvider value={{ filename, blueprintId }}>
        {children}
    </BlueprintProvider>
);

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
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(filename, baseModule);
    useModuleStore.setState({
        modules: { [filename]: baseModule },
        indexes: {},
        loading: {},
        loadOrder: [],
        loadModule: vi.fn(async () => {}),
    } as unknown as ReturnType<typeof useModuleStore.getState>);
});

describe("useBehaviorAutocomplete", () => {
    it("returns verb suggestions for empty input", () => {
        const { result } = renderHook(() => useBehaviorAutocomplete("", 0), {
            wrapper,
        });
        expect(result.current.map((s) => s.label)).toEqual(["WHEN"]);
    });

    it("returns entity suggestions after WHEN", () => {
        useShellStore.setState({
            activeFilePath: `module::${filename}`,
            activeModuleFilename: filename,
        });

        const { result } = renderHook(
            () => useBehaviorAutocomplete("WHEN ", 5),
            { wrapper },
        );

        expect(result.current.map((s) => s.label)).toEqual([
            "self",
            "global",
            "entity_alpha",
            "entity_beta",
        ]);
    });
});
