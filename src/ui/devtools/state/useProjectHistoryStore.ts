import { create } from "zustand";
import { vfs } from "../../../engine/vfs/FileSystem";
import { useUndoHistoryStore } from "./useUndoHistoryStore";
import type { Snapshot, ProjectHistoryState } from "./projectHistoryStore.types";

export type { Snapshot, ProjectHistoryState };

const readSnapshot = async (): Promise<Snapshot> => {
    const keys = await vfs.listFiles();
    const pairs = await Promise.all(
        keys.map(async (key) => [key, await vfs.readFile(key)] as const),
    );
    return pairs.reduce<Snapshot>((all, [key, value]) => {
        if (value) all[key] = value;
        return all;
    }, {});
};

const applySnapshot = async (snapshot: Snapshot) => {
    const current = await vfs.listFiles();
    if (current.length > 0) await vfs.deletePaths(current);
    await Promise.all(
        Object.entries(snapshot).map(async ([key, value]) =>
            vfs.writeFile(key, value as never),
        ),
    );
};

export const useProjectHistoryStore = create<ProjectHistoryState>()(
    (set, get) => ({
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,
        recordSnapshot: async () => {
            const current = await readSnapshot();
            set((state) => ({
                past: [...state.past, current],
                future: [],
                canUndo: true,
                canRedo: false,
            }));
            useUndoHistoryStore.getState().recordProjectEdit();
        },
        resetAndSnapshot: async () => {
            useUndoHistoryStore.getState().clear();
            const current = await readSnapshot();
            set(() => ({
                past: [current],
                future: [],
                canUndo: false,
                canRedo: false,
            }));
        },
        undo: async () => {
            const state = get();
            const previous = state.past.at(-1);
            if (!previous) return;
            const current = await readSnapshot();
            await applySnapshot(previous);
            set(() => ({
                past: state.past.slice(0, -1),
                future: [current, ...state.future],
                canUndo: state.past.length > 1,
                canRedo: true,
            }));
        },
        redo: async () => {
            const state = get();
            const next = state.future[0];
            if (!next) return;
            const current = await readSnapshot();
            await applySnapshot(next);
            set(() => ({
                past: [...state.past, current],
                future: state.future.slice(1),
                canUndo: true,
                canRedo: state.future.length > 1,
            }));
        },
    }),
);

export const recordProjectSnapshot = () =>
    useProjectHistoryStore.getState().recordSnapshot();

export const resetProjectHistory = () =>
    useProjectHistoryStore.getState().resetAndSnapshot();
