import { makeTabId } from "../tabIds";
import type { VirtualPath } from "../virtualPath";
import type { HandlerContext } from "./useWindowManagerRouteHandlers.types";

export const createBaseHandlers = ({
    openTab,
    ensureModuleSession,
}: HandlerContext) => ({
    module: (path: VirtualPath) => {
        if (path.kind !== "module") return;
        void ensureModuleSession(path.filename);
        openTab({
            id: makeTabId({ kind: "home" }),
            name: "Explorer",
            component: "home",
            enableClose: false,
            config: { filename: path.filename },
        });
    },
    meta: (path: VirtualPath) => {
        if (path.kind !== "meta") return;
        void ensureModuleSession(path.filename);
        openTab({
            id: makeTabId({ kind: "meta", filename: path.filename }),
            name: "Metadata",
            component: "meta",
            enableClose: true,
            config: { filename: path.filename },
        });
    },
    physics: (path: VirtualPath) => {
        if (path.kind !== "physics") return;
        void ensureModuleSession(path.filename);
        openTab({
            id: makeTabId({ kind: "physics", filename: path.filename }),
            name: "Physics",
            component: "physics",
            enableClose: true,
            config: { filename: path.filename },
        });
    },
    game_config: (path: VirtualPath) => {
        if (path.kind !== "game_config") return;
        void ensureModuleSession(path.filename);
        openTab({
            id: makeTabId({
                kind: "game_config",
                filename: path.filename,
            }),
            name: "Game Config",
            component: "game_config",
            enableClose: true,
            config: { filename: path.filename },
        });
    },
    vein_config: (path: VirtualPath) => {
        if (path.kind !== "vein_config") return;
        void ensureModuleSession(path.filename);
        openTab({
            id: makeTabId({
                kind: "vein_config",
                filename: path.filename,
            }),
            name: "Vein Config",
            component: "vein_config",
            enableClose: true,
            config: { filename: path.filename },
        });
    },
    world_entity: (path: VirtualPath) => {
        if (path.kind !== "world_entity") return;
        void ensureModuleSession(path.filename);
        openTab({
            id: makeTabId({
                kind: "world_entity",
                filename: path.filename,
            }),
            name: "World Entity",
            component: "world_entity",
            enableClose: true,
            config: { filename: path.filename },
        });
    },
});
