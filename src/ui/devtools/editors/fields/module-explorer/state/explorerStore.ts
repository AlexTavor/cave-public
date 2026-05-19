import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { ViewMode } from "../types";

interface ExplorerSession {
    filter: string;
    viewMode: ViewMode;

    // Asset Creation State
    createAssetModalOpen: boolean;

    // Delete Confirmation State
    pendingDeleteId: string | null;
    deleteImpact: Array<{ fromId: string; fromLabel: string; path: string }>;
    pendingDeleteAssetId: string | null;
}

interface ExplorerState {
    sessions: Record<string, ExplorerSession>;

    actions: {
        initSession: (sessionId: string) => void;
        setFilter: (sessionId: string, filter: string) => void;
        setViewMode: (sessionId: string, mode: ViewMode) => void;

        // Asset Creation
        openCreateAsset: (sessionId: string) => void;
        closeCreateAsset: (sessionId: string) => void;

        // Delete - Blueprint
        openDeleteBlueprint: (
            sessionId: string,
            id: string,
            impact: Array<{ fromId: string; fromLabel: string; path: string }>,
        ) => void;
        closeDeleteBlueprint: (sessionId: string) => void;

        // Delete - Asset
        setPendingDeleteAssetId: (sessionId: string, id: string | null) => void;
    };
}

const defaultSession: ExplorerSession = {
    filter: "",
    viewMode: "grid",
    createAssetModalOpen: false,
    pendingDeleteId: null,
    deleteImpact: [],
    pendingDeleteAssetId: null,
};

export const useExplorerStore = create<ExplorerState>()(
    immer((set) => ({
        sessions: {},

        actions: {
            initSession: (sessionId) =>
                set((state) => {
                    if (!state.sessions[sessionId]) {
                        state.sessions[sessionId] = { ...defaultSession };
                    }
                }),

            setFilter: (sessionId, filter) =>
                set((state) => {
                    if (state.sessions[sessionId]) {
                        state.sessions[sessionId].filter = filter;
                    }
                }),

            setViewMode: (sessionId, mode) =>
                set((state) => {
                    if (state.sessions[sessionId]) {
                        state.sessions[sessionId].viewMode = mode;
                    }
                }),

            openCreateAsset: (sessionId) =>
                set((state) => {
                    if (state.sessions[sessionId]) {
                        state.sessions[sessionId].createAssetModalOpen = true;
                    }
                }),

            closeCreateAsset: (sessionId) =>
                set((state) => {
                    if (state.sessions[sessionId]) {
                        state.sessions[sessionId].createAssetModalOpen = false;
                    }
                }),

            openDeleteBlueprint: (sessionId, id, impact) =>
                set((state) => {
                    if (state.sessions[sessionId]) {
                        state.sessions[sessionId].pendingDeleteId = id;
                        state.sessions[sessionId].deleteImpact = impact;
                    }
                }),

            closeDeleteBlueprint: (sessionId) =>
                set((state) => {
                    if (state.sessions[sessionId]) {
                        state.sessions[sessionId].pendingDeleteId = null;
                        state.sessions[sessionId].deleteImpact = [];
                    }
                }),

            setPendingDeleteAssetId: (sessionId, id) =>
                set((state) => {
                    if (state.sessions[sessionId]) {
                        state.sessions[sessionId].pendingDeleteAssetId = id;
                    }
                }),
        },
    })),
);
