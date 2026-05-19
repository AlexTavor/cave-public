import type { AssetCategory } from "../../state/moduleStore.assets";
import { ASSET_CATEGORIES } from "../../state/moduleStore.assets";

export const PATH_SEPARATOR = "::";

export const ROUTE_PREFIXES = [
    "module",
    "meta",
    "physics",
    "options",
    "pool",
    "list",
    "blueprint",
    "asset",
    "game_config",
    "background_config",
    "vein_config",
    "world_entity",
    "traits",
    "conditions",
    "guidances",
    "tutorials",
    "knowledge",
    "understanding",
    "camera_world",
    "carrier",
    "body",
] as const;

export type RoutePrefix = (typeof ROUTE_PREFIXES)[number];

export const isRoutePrefix = (value: string): value is RoutePrefix =>
    ROUTE_PREFIXES.includes(value as RoutePrefix);

export const isAssetCategory = (value: string): value is AssetCategory =>
    ASSET_CATEGORIES.includes(value as AssetCategory);

