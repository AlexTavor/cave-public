export const createBlueprintScopeId = (blueprintId: string) =>
    `blueprint:${blueprintId}`;

export const createAssetScopeId = (category: string, assetId: string) =>
    `asset:${category}:${assetId}`;

export const METADATA_SCOPE_ID = "metadata";
export const PHYSICS_SCOPE_ID = "physics";
