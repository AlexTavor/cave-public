export interface LogEntry {
    id: string;
    timestamp: number;
    type: "input" | "output" | "error" | "info" | "success";
    content: string;
}

export interface ShellState {
    // Editor State
    activeFilePath: string | null;
    activeModuleFilename: string | null;
    isEditorOpen: boolean;

    // Project State
    activeManifestPath: string | null;

    // Tab Presentation (FlexLayout)
    tabTitles: Record<string, string>;

    // Layout Mode Overlay
    isLayoutMode: boolean;
    layoutTargetFilename: string | null;
    isTextsMode: boolean;
    textsTargetManifestPath: string | null;

    // Actions
    openFile: (path: string) => void;
    closeFile: (path: string) => void;
    toggleEditor: (isOpen?: boolean) => void;
    setTabTitle: (tabId: string, title: string) => void;
    toggleLayoutMode: (active: boolean, filename?: string) => void;
    toggleTextsMode: (active: boolean, manifestPath?: string) => void;
    setActiveManifest: (path: string | null) => void;
    setActiveFileTabPath: (filePath: string | null) => void;

    // Logging Facade
    log: (type: LogEntry["type"], content: string) => void;
}

