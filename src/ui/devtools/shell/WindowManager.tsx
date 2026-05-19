import React, { useEffect, useMemo, useState } from "react";
import { Layout, Model } from "flexlayout-react";
import "flexlayout-react/style/dark.css";
import {
    ShellOverlay,
    LayoutContainer,
    LayoutSurface,
} from "./WindowManager.styles";
import { useShellStore } from "./shell";
import { useTabGuardStore } from "../state/tabGuardStore";
import { useLayoutStore } from "../state/useLayoutStore";
import { useModuleStore } from "../state/moduleStore";
import { useExplorerStore } from "../editors/fields/module-explorer/state/explorerStore";
import { WindowLayoutController } from "./window-manager/WindowLayoutController";
import { useFlexlayoutCloseGuard } from "./window-manager/useFlexlayoutCloseGuard";
import { CloseTabConfirmModal } from "./window-manager/CloseTabConfirmModal";
import { makeTabId } from "./window-manager/tabIds";
import { useWindowManagerRouteSync } from "./window-manager/hooks/useWindowManagerRouteSync";
import { useFlexlayoutPointerReleaseGuard } from "./window-manager/useFlexlayoutPointerReleaseGuard";
import { useWindowManagerLayoutAction } from "./window-manager/useWindowManagerLayoutAction";
import { GlobalEditorToolbar } from "./GlobalEditorToolbar";

export const WindowManager: React.FC = () => {
    const { activeFilePath, activeModuleFilename } = useShellStore();
    const isEditorOpen = useShellStore((s) => s.isEditorOpen);
    const getGuard = useTabGuardStore((s) => s.getGuard);
    const getLabel = useModuleStore((s) => s.getLabel);
    const initExplorerSession = useExplorerStore((s) => s.actions.initSession);
    const jsonModel = useLayoutStore((s) => s.model);
    const {
        openTab,
        closeTab,
        setModel: setLayoutModel,
        setActiveTab,
    } = useLayoutStore();

    const [model, setModel] = useState(() => Model.fromJson(jsonModel));

    useEffect(() => {
        const currentJson = model.toJson();
        const jsonModelString = JSON.stringify(jsonModel);
        const currentJsonString = JSON.stringify(currentJson);
        if (jsonModelString !== currentJsonString) {
            setModel(Model.fromJson(jsonModel));
        }
    }, [jsonModel, model]);

    const controller = useMemo(
        () => new WindowLayoutController({ activeModuleFilename }),
        [activeModuleFilename],
    );

    useEffect(() => {
        openTab({
            id: makeTabId({ kind: "home" }),
            name: "Explorer",
            component: "home",
            enableClose: false,
        });
    }, [openTab]);

    useWindowManagerRouteSync({
        activeFilePath,
        openTab,
        getLabel,
        initExplorerSession,
    });
    const {
        pendingCloseTabId,
        setPendingCloseTabId,
        onAction: onGuardAction,
        closeTabFromGuard,
    } = useFlexlayoutCloseGuard({
        closeTab: (id) => closeTab(id),
        getGuard,
    });
    useFlexlayoutPointerReleaseGuard(isEditorOpen);
    const handleLayoutAction = useWindowManagerLayoutAction({
        closeTab,
        onGuardAction,
        setActiveTab,
    });

    return (
        <ShellOverlay>
            {isEditorOpen && (
                <LayoutContainer>
                    <GlobalEditorToolbar />
                    <LayoutSurface>
                        <Layout
                            model={model}
                            factory={controller.factory}
                            onAction={handleLayoutAction}
                            onModelChange={(m) => {
                                setLayoutModel(m.toJson());
                            }}
                        />
                    </LayoutSurface>
                </LayoutContainer>
            )}

            {isEditorOpen && (
                <CloseTabConfirmModal
                    tabId={pendingCloseTabId}
                    getGuard={getGuard}
                    onClose={() => setPendingCloseTabId(null)}
                    closeTab={closeTabFromGuard}
                />
            )}
        </ShellOverlay>
    );
};

