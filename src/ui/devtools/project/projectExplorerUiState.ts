export const PROJECT_EXPLORER_UI_STATE_KEY = "cave.projectExplorer.uiState";

type PersistedExplorerState = {
    selection: string[];
    expanded: string[];
    anchorPath: string | null;
};

export const loadProjectExplorerUiState = (): PersistedExplorerState => {
    try {
        const raw = globalThis.localStorage?.getItem(
            PROJECT_EXPLORER_UI_STATE_KEY,
        );
        if (!raw) return { selection: [], expanded: [""], anchorPath: null };
        const parsed = JSON.parse(raw) as Partial<PersistedExplorerState>;
        return {
            selection: Array.isArray(parsed.selection) ? parsed.selection : [],
            expanded:
                Array.isArray(parsed.expanded) && parsed.expanded.length > 0
                    ? parsed.expanded
                    : [""],
            anchorPath:
                typeof parsed.anchorPath === "string"
                    ? parsed.anchorPath
                    : null,
        };
    } catch {
        return { selection: [], expanded: [""], anchorPath: null };
    }
};

export const saveProjectExplorerUiState = (state: PersistedExplorerState) => {
    try {
        globalThis.localStorage?.setItem(
            PROJECT_EXPLORER_UI_STATE_KEY,
            JSON.stringify(state),
        );
    } catch {
        // intentionally ignore storage failures
    }
};
