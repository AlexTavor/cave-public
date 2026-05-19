import { type IJsonModel } from "flexlayout-react";

export interface LayoutState {
    model: IJsonModel;
    activeTabId: string | null;
}

export type TabNodeConfig = {
    id: string;
    type?: "tab";
    name?: string;
    component?: string;
} & Record<string, unknown>;

export interface LayoutActions {
    openTab: (node: TabNodeConfig) => void;
    closeTab: (nodeId: string) => void;
    selectTab: (tabId: string) => void;
    renameTab: (nodeId: string, title: string) => void;
    setModel: (model: IJsonModel) => void;
    setActiveTab: (tabId: string) => void;
}
