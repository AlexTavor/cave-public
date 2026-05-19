export type Snapshot = Record<string, unknown>;

export interface ProjectHistoryState {
    past: Snapshot[];
    future: Snapshot[];
    canUndo: boolean;
    canRedo: boolean;
    recordSnapshot: () => Promise<void>;
    resetAndSnapshot: () => Promise<void>;
    undo: () => Promise<void>;
    redo: () => Promise<void>;
}
