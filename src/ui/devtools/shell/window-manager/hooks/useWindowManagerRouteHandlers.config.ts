import type { VirtualPath } from "../virtualPath";
import type { HandlerContext } from "./useWindowManagerRouteHandlers.types";
import { openConfigRouteTab } from "./openConfigRouteTab";

const buildHandler =
    <TKind extends VirtualPath["kind"]>(
        context: HandlerContext,
        kind: TKind,
        name: string,
    ) =>
    (path: VirtualPath) => {
        if (path.kind !== kind) return;
        openConfigRouteTab(context, path as any, name);
    };

export const createConfigHandlers = (context: HandlerContext) => ({
    background_config: buildHandler(
        context,
        "background_config",
        "Background Config",
    ),
    traits: buildHandler(context, "traits", "Global Traits"),
    conditions: buildHandler(context, "conditions", "Conditions Editor"),
    guidances: buildHandler(context, "guidances", "Guidances Editor"),
    tutorials: buildHandler(context, "tutorials", "Tutorials Editor"),
    knowledge: buildHandler(context, "knowledge", "Knowledge Editor"),
    understanding: buildHandler(
        context,
        "understanding",
        "Understanding Editor",
    ),
    camera_world: buildHandler(context, "camera_world", "Camera + World"),
    carrier: buildHandler(context, "carrier", "Carrier Editor"),
    body: buildHandler(context, "body", "Body Editor"),
});

