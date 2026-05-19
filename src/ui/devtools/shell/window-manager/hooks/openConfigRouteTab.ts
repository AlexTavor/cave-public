import { makeTabId } from "../tabIds";
import type { VirtualPath } from "../virtualPath";
import type { HandlerContext } from "./useWindowManagerRouteHandlers.types";

type ConfigPath = Extract<
    VirtualPath,
    {
        kind:
            | "background_config"
            | "traits"
            | "conditions"
            | "guidances"
            | "tutorials"
            | "knowledge"
            | "understanding"
            | "camera_world"
            | "carrier"
            | "body";
    }
>;

export const openConfigRouteTab = (
    context: HandlerContext,
    path: ConfigPath,
    name: string,
) => {
    void context.ensureModuleSession(path.filename);
    context.openTab({
        id: makeTabId({ kind: path.kind, filename: path.filename } as any),
        name,
        component: path.kind,
        enableClose: true,
        config: { filename: path.filename },
    });
};
