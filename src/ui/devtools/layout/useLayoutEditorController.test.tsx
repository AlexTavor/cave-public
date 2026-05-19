// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Runtime } from "../../../engine/runtime/Runtime";
import type { PositionUpdate } from "./persistence/layoutPersistence";
import { useLayoutEditorController } from "./useLayoutEditorController";

const testMocks = vi.hoisted(() => ({
    runtime: { destroy: vi.fn() } as unknown as Runtime,
    persistProjectLayout: vi.fn(async () => undefined),
    harvestPositions: vi.fn((): PositionUpdate[] => []),
    loadCartridge: vi.fn(),
    toggleLayoutMode: vi.fn(),
    log: vi.fn(),
}));

vi.mock("./useLayoutEditorRuntime", () => ({
    useLayoutEditorRuntime: vi.fn(() => ({
        runtime: testMocks.runtime,
        isLoading: false,
    })),
}));
vi.mock("./useLayoutEditorTicker", () => ({ useLayoutEditorTicker: vi.fn() }));
vi.mock("./persistence/layoutPersistence", () => ({
    harvestPositions: testMocks.harvestPositions,
}));
vi.mock("./persistence/persistProjectLayout", () => ({
    persistProjectLayout: testMocks.persistProjectLayout,
}));
vi.mock("../../runtime/state/useRuntimeStore", () => ({
    useRuntimeStore: (
        selector: (state: {
            loadCartridge: typeof testMocks.loadCartridge;
        }) => unknown,
    ) => selector({ loadCartridge: testMocks.loadCartridge }),
}));
vi.mock("../shell/shell", () => ({
    useShellStore: (
        selector: (state: {
            log: typeof testMocks.log;
            toggleLayoutMode: typeof testMocks.toggleLayoutMode;
        }) => unknown,
    ) =>
        selector({
            log: testMocks.log,
            toggleLayoutMode: testMocks.toggleLayoutMode,
        }),
}));
vi.mock("../../../engine/terminal/commands/projectCartridgeAdapter", () => ({
    toModuleCartridge: vi.fn((value: unknown) => value),
}));
vi.mock("../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: { activeCartridge: { blueprints: {} } },
}));

describe("useLayoutEditorController", () => {
    beforeEach(() => {
        testMocks.persistProjectLayout.mockClear();
        testMocks.harvestPositions.mockReset();
        testMocks.loadCartridge.mockClear();
        testMocks.toggleLayoutMode.mockClear();
        testMocks.log.mockClear();
    });

    it("is ready when the project runtime is hydrated", () => {
        const { result } = renderHook(() =>
            useLayoutEditorController("project/manifest.json"),
        );
        expect(result.current.isReady).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.runtime).toBe(testMocks.runtime);
    });

    it("saves harvested layout positions back to the project", async () => {
        testMocks.harvestPositions.mockReturnValue([
            { blueprintId: "hero", x: 10, y: 20 },
        ]);
        const { result } = renderHook(() =>
            useLayoutEditorController("project/manifest.json"),
        );

        await act(async () => {
            result.current.handleConfirm();
            await Promise.resolve();
        });

        expect(testMocks.persistProjectLayout).toHaveBeenCalledWith(
            "project/manifest.json",
            [{ blueprintId: "hero", x: 10, y: 20 }],
        );
        expect(testMocks.loadCartridge).toHaveBeenCalled();
        expect(testMocks.toggleLayoutMode).toHaveBeenCalledWith(false);
    });

    it("aborts layout mode without persisting", () => {
        const { result } = renderHook(() =>
            useLayoutEditorController("project/manifest.json"),
        );

        act(() => {
            result.current.handleCancel();
        });

        expect(testMocks.persistProjectLayout).not.toHaveBeenCalled();
        expect(testMocks.toggleLayoutMode).toHaveBeenCalledWith(false);
    });
});

