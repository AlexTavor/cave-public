// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectHistoryStore } from "./useProjectHistoryStore";
import { useUndoHistoryStore } from "./useUndoHistoryStore";

const data: Record<string, unknown> = { "a.bp": { id: "a" } };

const vfsMock = vi.hoisted(() => ({
    listFiles: vi.fn(async () => Object.keys(data)),
    readFile: vi.fn(async (path: string) => (data[path] ?? null) as never),
    deletePaths: vi.fn(async (paths: string[]) => {
        paths.forEach((path) => delete data[path]);
    }),
    writeFile: vi.fn(async (path: string, value: unknown) => {
        data[path] = value;
    }),
}));

vi.mock("../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));

describe("useProjectHistoryStore", () => {
    beforeEach(() => {
        data["a.bp"] = { id: "a" };
        delete data["b.bp"];
        useProjectHistoryStore.setState({
            past: [],
            future: [],
            canUndo: false,
            canRedo: false,
        });
        useUndoHistoryStore.getState().clear();
        vi.clearAllMocks();
    });

    it("undoes and redoes project snapshots", async () => {
        await useProjectHistoryStore.getState().recordSnapshot();
        data["b.bp"] = { id: "b" };

        await useProjectHistoryStore.getState().undo();
        expect(data["b.bp"]).toBeUndefined();
        expect(useProjectHistoryStore.getState().canRedo).toBe(true);

        await useProjectHistoryStore.getState().redo();
        expect(data["b.bp"]).toEqual({ id: "b" });
        expect(useProjectHistoryStore.getState().canUndo).toBe(true);
    });

    it("recordSnapshot records project edit in unified history", async () => {
        await useProjectHistoryStore.getState().recordSnapshot();
        const hist = useUndoHistoryStore.getState();
        expect(hist.past).toEqual([{ kind: "project" }]);
        expect(hist.canUndo).toBe(true);
    });

    it("resetAndSnapshot clears unified history", async () => {
        await useProjectHistoryStore.getState().recordSnapshot();
        await useProjectHistoryStore.getState().resetAndSnapshot();
        const hist = useUndoHistoryStore.getState();
        expect(hist.past).toEqual([]);
        expect(hist.canUndo).toBe(false);
    });
});
