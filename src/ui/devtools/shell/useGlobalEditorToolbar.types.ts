export interface GlobalEditorToolbarViewModel {
    filename: string;
    activeFilePath: string | null;
    statusVariant: "dirty" | "clean" | "loading";
    statusLabel: string;
    isSaving: boolean;
    isCompiling: boolean;
    isExportingBootstrap: boolean;
    disableUndo: boolean;
    disableRedo: boolean;
    disableSave: boolean;
    disableCompile: boolean;
    disableExportBootstrap: boolean;
    disablePhysics: boolean;
    disableTexts: boolean;
    handleMenu: () => void;
    undo: () => void;
    redo: () => void;
    handleTexts: () => void;
    handlePhysics: () => void;
    handleSave: () => Promise<void>;
    handleCompile: () => Promise<void>;
    handleExportBootstrap: () => Promise<void>;
}
