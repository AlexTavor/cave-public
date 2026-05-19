import type { AssetCategory } from "../../state/moduleStore.assets";

export type VirtualPath =
    | { kind: "module"; filename: string }
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
    | { kind: "pool"; filename: string; poolId: string }
    | { kind: "list"; filename: string; section: "blueprints" }
    | { kind: "list"; filename: string; section: "draft_pools" }
    | {
          kind: "list";
          filename: string;
          section: "assets";
          category: AssetCategory;
      }
    | { kind: "blueprint"; filename: string; blueprintId: string }
    | {
          kind: "asset";
          filename: string;
          category: AssetCategory;
          assetId: string;
      };

