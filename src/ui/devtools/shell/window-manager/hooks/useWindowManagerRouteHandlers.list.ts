import { makeTabId } from "../tabIds";
import { serializeVirtualPath, type VirtualPath } from "../virtualPath";
import type { HandlerContext } from "./useWindowManagerRouteHandlers.types";

export const createListHandlers = ({
    openTab,
    initExplorerSession,
    ensureModuleSession,
}: HandlerContext) => ({
    list: (path: VirtualPath) => {
        if (path.kind !== "list") return;
        void ensureModuleSession(path.filename);
        const sessionId = serializeVirtualPath(path);
        initExplorerSession(sessionId);

        if (path.section === "blueprints") {
            openTab({
                id: makeTabId({
                    kind: "blueprint_list",
                    filename: path.filename,
                }),
                name: "Blueprints",
                component: "blueprint_list",
                enableClose: true,
                config: {
                    filename: path.filename,
                },
            });
            return;
        }

        if (path.section === "draft_pools") {
            openTab({
                id: makeTabId({
                    kind: "draft_pool_list",
                    filename: path.filename,
                }),
                name: "Draft Pools",
                component: "draft_pool_list",
                enableClose: true,
                config: {
                    filename: path.filename,
                },
            });
            return;
        }

        openTab({
            id: makeTabId({
                kind: "asset_list",
                filename: path.filename,
                category: path.category,
            }),
            name: `Assets: ${path.category}`,
            component: "asset_list",
            enableClose: true,
            config: {
                filename: path.filename,
                category: path.category,
            },
        });
    },
});
