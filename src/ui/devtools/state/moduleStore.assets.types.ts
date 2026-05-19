export type AssetCategory = "displays" | "styles" | "glyphs";

export const ASSET_CATEGORY_DISPLAYS: AssetCategory = "displays";
export const ASSET_CATEGORY_STYLES: AssetCategory = "styles";
export const ASSET_CATEGORY_GLYPHS: AssetCategory = "glyphs";

export const ASSET_CATEGORIES: readonly AssetCategory[] = [
    "displays",
    "styles",
    "glyphs",
] as const;

export interface TransferNodeRadiusByValueRule {
    minValue: number;
    minRadius: number;
    maxValue: number;
    maxRadius: number;
}

export type ModuleDisplayAsset =
    | {
          type: "body";
          tooltip?: string;
          tags?: string[];
      }
    | {
          type: "attribute_pool";
          attribute: "body" | "mind" | "social";
          tooltip?: string;
          tags?: string[];
      }
    | {
          type: "resource";
          styleId: string;
          glyphKey: string;
          transferNodeRadiusByValue?: TransferNodeRadiusByValueRule;
          tooltip?: string;
          tags?: string[];
      };

