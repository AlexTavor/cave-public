import { Actions } from "flexlayout-react";
import { useCallback } from "react";

export const useWindowManagerLayoutAction = (params: {
    closeTab: (tabId: string) => void;
    onGuardAction: (action: any) => any;
    setActiveTab: (tabId: string) => void;
}) => {
    const { closeTab, onGuardAction, setActiveTab } = params;
    return useCallback(
        (action: any) => {
            const guardedAction = onGuardAction(action);
            if (!guardedAction) return undefined;
            if (action.type === Actions.DELETE_TAB) {
                closeTab(action.data.node);
                return undefined;
            }
            if (action.type === Actions.SELECT_TAB) {
                setActiveTab(action.data.tabNode);
            }
            return action;
        },
        [closeTab, onGuardAction, setActiveTab],
    );
};
