import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUndoHistoryStore } from "./useUndoHistoryStore";
import { useSessionStore } from "./useSessionStore";
import { useProjectHistoryStore } from "./useProjectHistoryStore";

vi.mock("../../../engine/vfs/FileSystem", () => ({
    vfs: {
        listFiles: vi.fn(async () => []),
        readFile: vi.fn(async () => null),
        deletePaths: vi.fn(async () => {}),
        writeFile: vi.fn(async () => {}),
    },
}));

const execute = async (dir: "undo" | "redo") => {
    const h = useUndoHistoryStore.getState();
    const entry = dir === "undo" ? h.peekUndo() : h.peekRedo();
    if (!entry || h.isBusy) return;
    h.setBusy(true);
    try {
        if (entry.kind === "session") {
            useSessionStore.getState()[dir](entry.sessionId);
        } else {
            await useProjectHistoryStore.getState()[dir]();
        }
        useUndoHistoryStore
            .getState()
            [dir === "undo" ? "commitUndo" : "commitRedo"]();
    } finally {
        useUndoHistoryStore.getState().setBusy(false);
    }
};

const hist = () => useUndoHistoryStore.getState();

const reset = () =>
    useUndoHistoryStore.setState({
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,
        isBusy: false,
    });

describe("useUnifiedUndo logic", () => {
    let sessionCalls: { undo: string[]; redo: string[] };

    beforeEach(() => {
        reset();
        sessionCalls = { undo: [], redo: [] };
        const origUndo = useSessionStore.getState().undo;
        const origRedo = useSessionStore.getState().redo;
        useSessionStore.setState({
            undo: (id: string) => {
                sessionCalls.undo.push(id);
                origUndo(id);
            },
            redo: (id: string) => {
                sessionCalls.redo.push(id);
                origRedo(id);
            },
        });
    });

    it("undo dispatches session undo and commits", async () => {
        hist().recordSessionEdit("mod.bp");
        await execute("undo");
        expect(sessionCalls.undo).toContain("mod.bp");
        expect(hist().canRedo).toBe(true);
        expect(hist().canUndo).toBe(false);
    });

    it("undo dispatches project undo and commits", async () => {
        let called = false;
        useProjectHistoryStore.setState({
            undo: async () => {
                called = true;
            },
        });
        hist().recordProjectEdit();
        await execute("undo");
        expect(called).toBe(true);
        expect(hist().canRedo).toBe(true);
    });

    it("redo mirrors undo", async () => {
        hist().recordSessionEdit("mod.bp");
        await execute("undo");
        await execute("redo");
        expect(sessionCalls.redo).toContain("mod.bp");
        expect(hist().canUndo).toBe(true);
        expect(hist().canRedo).toBe(false);
    });

    it("no-ops when busy", async () => {
        hist().recordSessionEdit("a");
        hist().setBusy(true);
        await execute("undo");
        expect(sessionCalls.undo).toEqual([]);
    });

    it("does not commit if underlying undo throws", async () => {
        useProjectHistoryStore.setState({
            undo: async () => {
                throw new Error("fail");
            },
        });
        hist().recordProjectEdit();
        await execute("undo").catch(() => {});
        expect(hist().canUndo).toBe(true);
        expect(hist().isBusy).toBe(false);
    });
});
