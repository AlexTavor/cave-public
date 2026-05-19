import { defaultLayout } from "../shell/defaultLayout";
import { useLayoutStore } from "../state/useLayoutStore";
import { useShellStore } from "../shell/shell";
import { useSessionStore } from "../state/useSessionStore";
import { useModuleStore } from "../state/moduleStore";
import { clearAllPersistedDrafts } from "../state/sessionStore/storage";
import { clearAllPersistedSessionUi } from "../state/sessionStore/storageSessionUi";
import { resetPendingSessionLoads } from "../state/moduleSession/sessionInit";

export const resetModuleEditorState = () => {
    useSessionStore.setState({ sessions: {} });
    clearAllPersistedDrafts();
    clearAllPersistedSessionUi();
    resetPendingSessionLoads();
    useModuleStore.setState({
        modules: {},
        indexes: {},
        loading: {},
        loadOrder: [],
    });
};

export const closeWorkspaceState = (unload?: () => void) => {
    useLayoutStore.getState().setModel(defaultLayout);
    useLayoutStore.setState({ activeTabId: null });
    useShellStore.setState({
        activeFilePath: null,
        activeModuleFilename: null,
        activeManifestPath: null,
        tabTitles: {},
    });
    resetModuleEditorState();
    unload?.();
};
