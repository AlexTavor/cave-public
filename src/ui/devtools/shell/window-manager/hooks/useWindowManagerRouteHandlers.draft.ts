import { makeTabId } from "../tabIds";
import type { VirtualPath } from "../virtualPath";
import type { HandlerContext } from "./useWindowManagerRouteHandlers.types";

export const createDraftHandlers = ({
    openTab,
    ensureModuleSession,
}: HandlerContext) => ({
    options: (path: VirtualPath) => {
        if (path.kind !== "options") return;
        void ensureModuleSession(path.filename);
        openTab({
            id: makeTabId({ kind: "options", filename: path.filename }),
            name: "Draft Options",
            component: "draft_options",
            enableClose: true,
            config: { filename: path.filename },
        });
    },
    pool: (path: VirtualPath) => {
        if (path.kind !== "pool") return;
        void ensureModuleSession(path.filename);
        openTab({
            id: makeTabId({
                kind: "draft_pool_editor",
                filename: path.filename,
                poolId: path.poolId,
            }),
            name: path.poolId,
            component: "draft_pool_editor",
            enableClose: true,
            config: {
                filename: path.filename,
                poolId: path.poolId,
            },
        });
    },
});
