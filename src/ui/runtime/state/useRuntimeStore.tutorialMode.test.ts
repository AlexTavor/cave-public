import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRuntimeStore } from "./useRuntimeStore";

vi.mock("../../../game/services/SaveGameService", () => ({
    SaveGameService: {
        save: vi.fn(),
        load: vi.fn(),
        list: vi.fn(),
        remove: vi.fn(),
    },
}));
vi.mock("../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: {
        getManifestPath: vi.fn(() => null),
        loadProject: vi.fn(),
        activeCartridge: null,
    },
}));
vi.mock("../../../engine/terminal/commands/projectCartridgeAdapter", () => ({
    toModuleCartridge: vi.fn((value) => value),
}));

describe("useRuntimeStore tutorial mode reset", () => {
    beforeEach(() => {
        useRuntimeStore.setState({ runtime: null, status: "idle" } as any);
    });

    it("restores tutorial mode after runtime reset", () => {
        let world = { state: { tutorial_mode: { value: 0 } } };
        const enqueue = vi.fn();
        const flushCommands = vi.fn();
        const runtime = {
            commands: { enqueue },
            flushCommands,
            getEntity: () => world,
            reset: vi.fn(() => {
                world = { state: { tutorial_mode: { value: 1 } } };
            }),
        };

        useRuntimeStore.setState({
            runtime: runtime as any,
            status: "running",
        } as any);
        useRuntimeStore.getState().reset();

        expect(runtime.reset).toHaveBeenCalledTimes(1);
        expect(enqueue).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({
                    key: "tutorial_mode",
                    value: 0,
                }),
            }),
        );
        expect(flushCommands).toHaveBeenCalledTimes(1);
    });
});
