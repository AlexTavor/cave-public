import type { AssetCategory } from "../../state/moduleStore.assets";

export type TabIdParams =
    | { kind: "home" }
    | { kind: "terminal" }
    | { kind: "file"; path: string }
    | { kind: "meta"; filename: string }
    | { kind: "physics"; filename: string }
    | { kind: "options"; filename: string }
    | { kind: "game_config"; filename: string }
    | { kind: "background_config"; filename: string }
    | { kind: "vein_config"; filename: string }
    | { kind: "world_entity"; filename: string }
    | { kind: "traits"; filename: string }
    | { kind: "conditions"; filename: string }
    | { kind: "guidances"; filename: string }
    | { kind: "tutorials"; filename: string }
    | { kind: "knowledge"; filename: string }
    | { kind: "understanding"; filename: string }
    | { kind: "camera_world"; filename: string }
    | { kind: "carrier"; filename: string }
    | { kind: "body"; filename: string }
    | { kind: "draft_pool_list"; filename: string }
    | { kind: "draft_pool_editor"; filename: string; poolId: string }
    | { kind: "blueprint_list"; filename: string }
    | { kind: "asset_list"; filename: string; category: AssetCategory }
    | { kind: "blueprint"; filename: string; blueprintId: string }
    | {
          kind: "asset";
          filename: string;
          category: AssetCategory;
          assetId: string;
      };

export function encodeIdPart(value: string) {
    return encodeURIComponent(value);
}

export function makeTabId(params: TabIdParams) {
    switch (params.kind) {
        case "home":
            return "home";
        case "terminal":
            return "terminal";
        case "file":
            return `file:${encodeIdPart(params.path)}`;
        case "meta":
            return `meta:${encodeIdPart(params.filename)}`;
        case "physics":
            return `physics:${encodeIdPart(params.filename)}`;
        case "options":
            return `options:${encodeIdPart(params.filename)}`;
        case "game_config":
            return `game_config:${encodeIdPart(params.filename)}`;
        case "background_config":
            return `background_config:${encodeIdPart(params.filename)}`;
        case "vein_config":
            return `vein_config:${encodeIdPart(params.filename)}`;
        case "world_entity":
            return `world_entity:${encodeIdPart(params.filename)}`;
        case "traits":
            return `traits:${encodeIdPart(params.filename)}`;
        case "conditions":
            return `conditions:${encodeIdPart(params.filename)}`;
        case "guidances":
            return `guidances:${encodeIdPart(params.filename)}`;
        case "tutorials":
            return `tutorials:${encodeIdPart(params.filename)}`;
        case "knowledge":
            return `knowledge:${encodeIdPart(params.filename)}`;
        case "understanding":
            return `understanding:${encodeIdPart(params.filename)}`;
        case "camera_world":
            return `camera_world:${encodeIdPart(params.filename)}`;
        case "carrier":
            return `carrier:${encodeIdPart(params.filename)}`;
        case "body":
            return `body:${encodeIdPart(params.filename)}`;
        case "draft_pool_list":
            return `list:draft_pools:${encodeIdPart(params.filename)}`;
        case "draft_pool_editor":
            return `pool:${encodeIdPart(params.filename)}:${encodeIdPart(
                params.poolId,
            )}`;
        case "blueprint_list":
            return `list:blueprints:${encodeIdPart(params.filename)}`;
        case "asset_list":
            return `list:assets:${encodeIdPart(params.filename)}:${encodeIdPart(
                params.category,
            )}`;
        case "blueprint":
            return `bp:${encodeIdPart(params.filename)}:${encodeIdPart(
                params.blueprintId,
            )}`;
        case "asset":
            return `asset:${encodeIdPart(params.filename)}:${encodeIdPart(
                params.category,
            )}:${encodeIdPart(params.assetId)}`;
    }
}

