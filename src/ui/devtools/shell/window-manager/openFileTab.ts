import type { OpenTab } from "./hooks/useWindowManagerRouteHandlers.types";
import { makeTabId } from "./tabIds";

export const openFileTab = (openTab: OpenTab, path: string) => {
    openTab({
        id: makeTabId({ kind: "file", path }),
        name: path.split("/").pop() ?? path,
        component: "file",
        enableClose: true,
        config: { path },
    });
};
