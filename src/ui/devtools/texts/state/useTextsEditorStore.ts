import { create } from "zustand";
import type { ModuleCartridge } from "../../../../data/schemas/module";
import { deepClone, setByPath } from "../../../../utils/objectUtils";
import type { TextFieldCategory, TextOwnerType } from "../types";

export interface TextsEditorState {
    manifestPath: string | null;
    files: string[];
    draftsByFile: Record<string, ModuleCartridge>;
    baselineByFile: Record<string, ModuleCartridge>;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    categoryFilter: "all" | TextFieldCategory;
    typeFilter: "all" | TextOwnerType;
    query: string;
    beginLoad: (manifestPath: string) => void;
    finishLoad: (
        files: string[],
        draftsByFile: Record<string, ModuleCartridge>,
    ) => void;
    failLoad: (message: string) => void;
    setCategoryFilter: (value: "all" | TextFieldCategory) => void;
    setTypeFilter: (value: "all" | TextOwnerType) => void;
    setQuery: (value: string) => void;
    updateText: (filename: string, path: string, value: string) => void;
    beginSave: () => void;
    finishSave: (savedByFile: Record<string, ModuleCartridge>) => void;
    failSave: (message: string) => void;
    discard: () => void;
}

const initialState = {
    manifestPath: null,
    files: [],
    draftsByFile: {},
    baselineByFile: {},
    isLoading: false,
    isSaving: false,
    error: null,
    categoryFilter: "all" as const,
    typeFilter: "all" as const,
    query: "",
};

const cloneFiles = (files: Record<string, ModuleCartridge>) =>
    Object.fromEntries(
        Object.entries(files).map(([key, value]) => [key, deepClone(value)]),
    );

export const useTextsEditorStore = create<TextsEditorState>((set) => ({
    ...initialState,
    beginLoad: (manifestPath) =>
        set(() => ({ ...initialState, manifestPath, isLoading: true })),
    finishLoad: (files, draftsByFile) => {
        const drafts = cloneFiles(draftsByFile);
        set((state) => ({
            ...state,
            files: [...files],
            draftsByFile: drafts,
            baselineByFile: cloneFiles(draftsByFile),
            isLoading: false,
            error: null,
        }));
    },
    failLoad: (message) =>
        set((state) => ({ ...state, isLoading: false, error: message })),
    setCategoryFilter: (categoryFilter) => set(() => ({ categoryFilter })),
    setTypeFilter: (typeFilter) => set(() => ({ typeFilter })),
    setQuery: (query) => set(() => ({ query })),
    updateText: (filename, path, value) =>
        set((state) => {
            const current = state.draftsByFile[filename];
            if (!current) return state;
            const next = deepClone(current);
            setByPath(next, path, value);
            return {
                ...state,
                draftsByFile: { ...state.draftsByFile, [filename]: next },
            };
        }),
    beginSave: () =>
        set((state) => ({ ...state, isSaving: true, error: null })),
    finishSave: (savedByFile) =>
        set((state) => ({
            ...state,
            isSaving: false,
            draftsByFile: { ...state.draftsByFile, ...cloneFiles(savedByFile) },
            baselineByFile: {
                ...state.baselineByFile,
                ...cloneFiles(savedByFile),
            },
        })),
    failSave: (message) =>
        set((state) => ({ ...state, isSaving: false, error: message })),
    discard: () => set(() => initialState),
}));
