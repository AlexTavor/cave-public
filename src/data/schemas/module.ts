import { z } from "zod";
import { BlueprintSchema } from "./blueprint";
import { AssetCollectionSchema } from "./assets";
import { BlueprintConfigSchema } from "./blueprintConfig";
import { DraftOptionBlueprintSchema, DraftPoolBlueprintSchema } from "./draft";

export const ModuleMetadataSchema = z.object({
  id: z.string().describe("ui:disabled"), // ID == filename
  name: z.string(),
  version: z.string().default("0.0.1"),
  author: z.string().optional(),
  description: z.string().optional().describe("ui:textarea"),
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const applyLegacySetting = (
  target: Record<string, unknown>,
  key: "impulse" | "game_config",
  settings: Record<string, unknown> | undefined,
): void => {
  const candidate = settings?.[key];
  if (candidate != null && target[key] == null) {
    target[key] = candidate;
  }
};

const stripLegacyConfigFromAssets = (
  assets: Record<string, unknown>,
): Record<string, unknown> => {
  const nextAssets = { ...assets };
  if ("traits" in nextAssets) delete nextAssets.traits;

  const nextAssetSettings = asRecord(nextAssets.settings);
  if (Object.keys(nextAssetSettings).length === 0) return nextAssets;

  const cleanedSettings = { ...nextAssetSettings };
  delete cleanedSettings.impulse;
  delete cleanedSettings.game_config;
  nextAssets.settings = cleanedSettings;
  return nextAssets;
};

const migrateBlueprintConfig = (input: unknown) => {
  if (!input || typeof input !== "object") return input;
  const raw = input as Record<string, unknown>;
  const scripts = (raw as any).scripts;
  const assets = asRecord((raw as any).assets);
  const settings =
    (assets as any).settings ?? (assets as any).configs ?? undefined;

  const legacyBlueprint = asRecord((raw as any).blueprint);
  const config = asRecord((raw as any).config);
  const nextConfig = {
    ...legacyBlueprint,
    ...config,
  } as Record<string, unknown>;
  const legacySettings = (legacyBlueprint as any).settings;
  const configSettings = (config as any).settings;
  const nextSettings = {
    ...(legacySettings ? { ...legacySettings } : {}),
    ...(configSettings ? { ...configSettings } : {}),
  } as Record<string, unknown>;

  const legacyTraits = (assets as any).traits;
  if (legacyTraits && nextConfig.traits == null) {
    nextConfig.traits = legacyTraits;
  }

  applyLegacySetting(nextSettings, "impulse", settings);
  applyLegacySetting(nextSettings, "game_config", settings);

  if (Object.keys(nextSettings).length > 0) {
    nextConfig.settings = nextSettings;
  }

  if (Object.keys(nextConfig).length === 0) {
    return input;
  }

  const nextAssets = stripLegacyConfigFromAssets(assets);

  return {
    ...raw,
    assets: nextAssets,
    config: nextConfig,
    scripts: scripts && typeof scripts === "object" ? scripts : {},
  } as Record<string, unknown>;
};

const ModuleCartridgeObjectSchema = z.object({
  metadata: ModuleMetadataSchema,
  // We use a record for blueprints: "id" -> Blueprint
  blueprints: z.record(z.string(), BlueprintSchema).describe("ui:collapsed"),

  draftOptions: z.record(z.string(), DraftOptionBlueprintSchema).optional(),
  draftPools: z.record(z.string(), DraftPoolBlueprintSchema).optional(),
  scripts: z.record(z.string(), z.string()).optional(),

  config: BlueprintConfigSchema.optional(),

  // Visual/config assets embedded in the module
  assets: AssetCollectionSchema,
});

export const ModuleCartridgeSchema = z.preprocess(
  migrateBlueprintConfig,
  ModuleCartridgeObjectSchema,
);

export type ModuleMetadata = z.infer<typeof ModuleMetadataSchema>;
export type ModuleCartridge = z.infer<typeof ModuleCartridgeSchema>;
export type ModuleCartridgeInput = z.input<typeof ModuleCartridgeSchema>;
