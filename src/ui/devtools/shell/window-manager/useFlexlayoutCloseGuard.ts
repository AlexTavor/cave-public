import { useState } from "react";
import { Actions } from "flexlayout-react";
import type { TabGuard } from "../../state/tabGuardStore";

export function useFlexlayoutCloseGuard(params: {
    closeTab: (tabId: string) => void;
    getGuard: (tabId: string) => TabGuard | null;
}) {
    const { closeTab, getGuard } = params;

    const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(
        null,
    );

    const onAction = (action: any) => {
        if (action.type === Actions.DELETE_TAB) {
            const tabId = action.data?.node as string | undefined;
            if (tabId) {
                const guard = getGuard(tabId);
                // If dirty, block the close and show modal
                if (guard?.isDirty) {
                    setPendingCloseTabId(tabId);
                    return undefined;
                }
            }
        }
        // If we don't block it, return the action to let FlexLayout handle it (or let onAction wrapper handle it)
        return action;
    };

    const closeTabFromGuard = (tabId: string) => {
        closeTab(tabId);
    };

    return {
        pendingCloseTabId,
        setPendingCloseTabId,
        onAction,
        closeTabFromGuard,
    };
}
