import { makeTabId } from "../tabIds";
import type { VirtualPath } from "../virtualPath";
import type { HandlerContext } from "./useWindowManagerRouteHandlers.types";

export const createEntityHandlers = ({
    openTab,
    getLabel,
    ensureModuleSession,
}: HandlerContext) => ({
    blueprint: (path: VirtualPath) => {
        if (path.kind !== "blueprint") return;
        void ensureModuleSession(path.filename);
        const label = getLabel(path.filename, path.blueprintId);
        openTab({
            id: makeTabId({
                kind: "blueprint",
                filename: path.filename,
                blueprintId: path.blueprintId,
            }),
            name: label,
            component: "blueprint",
            enableClose: true,
            config: {
                filename: path.filename,
                blueprintId: path.blueprintId,
            },
        });
    },
    asset: (path: VirtualPath) => {
        if (path.kind !== "asset") return;
        void ensureModuleSession(path.filename);
        openTab({
            id: makeTabId({
                kind: "asset",
                filename: path.filename,
                category: path.category,
                assetId: path.assetId,
            }),
            name: path.assetId,
            component: "asset",
            enableClose: true,
            config: {
                filename: path.filename,
                category: path.category,
                assetId: path.assetId,
            },
        });
    },
});
