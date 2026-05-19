import type { VirtualPath } from "../virtualPath";

export type OpenTab = (node: {
    id: string;
    name?: string;
    component?: string;
    enableClose?: boolean;
    config?: Record<string, unknown>;
}) => void;

export type GetLabel = (filename: string, blueprintId: string) => string;

export type InitExplorerSession = (sessionId: string) => void;

export type HandlerMap = Record<
    VirtualPath["kind"],
    (path: VirtualPath) => void
>;

export type HandlerContext = {
    openTab: OpenTab;
    getLabel: GetLabel;
    initExplorerSession: InitExplorerSession;
    ensureModuleSession: (filename: string) => Promise<void>;
};
