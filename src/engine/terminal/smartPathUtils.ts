import type { ExecutionContext, Suggestion } from "../../lib/terminal";
import { fileCache } from "./fileUtils";
import type { ModuleCartridge } from "../../data/schemas/module";
import type { Blueprint } from "../../data/schemas/blueprint";
import { AssetCollection } from "../../data/schemas/assets";

const VIRTUAL_PATH_SEPARATOR = "::";
const ROOT_KEYS = ["metadata", "assets", "blueprints"] as const;

export interface ParsedVirtualPathToken {
    filename: string;
    segments: string[];
    hasTrailingSeparator: boolean;
}

export function parseVirtualPathToken(token: string): ParsedVirtualPathToken {
    const normalized = token.trim();
    const hasTrailingSeparator = normalized.endsWith(VIRTUAL_PATH_SEPARATOR);
    const parts = normalized.split(VIRTUAL_PATH_SEPARATOR);

    const filename = parts[0] ?? "";
    const segments = parts.slice(1);

    return { filename, segments, hasTrailingSeparator };
}

export function getMultipartSuggestions(
    args: string[],
    context: ExecutionContext,
): Suggestion[] {
    const token = args.at(-1) || "";
    const { filename, segments } = parseVirtualPathToken(token);

    // FIX: Removed the check for empty filename to allow listing all files when input is empty
    // if (!filename) return [];

    if (segments.length === 0) {
        return getDepth0Suggestions(token, context);
    }

    // Only suggest contents if the file actually exists
    if (context.resources && !context.resources.hasFile(filename)) {
        return [];
    }

    type DepthHandler = (
        filename: string,
        segments: string[],
        context: ExecutionContext,
    ) => Suggestion[];
    const depthHandlers: Array<DepthHandler | undefined> = [
        undefined,
        getDepth1Suggestions,
        getDepth2Suggestions,
        getDepth3Suggestions,
    ];

    return depthHandlers[segments.length]?.(filename, segments, context) ?? [];
}

function getDepth0Suggestions(
    token: string,
    context: ExecutionContext,
): Suggestion[] {
    return getFileSuggestions(token, context);
}

function getDepth1Suggestions(
    filename: string,
    segments: string[],
    _context: ExecutionContext,
): Suggestion[] {
    return getRootSuggestions(filename, segments[0]);
}

function getDepth2Suggestions(
    filename: string,
    segments: string[],
    context: ExecutionContext,
): Suggestion[] {
    const [root, second] = segments;
    const handlers: Record<string, () => Suggestion[]> = {
        blueprints: () =>
            getBlueprintSuggestions(filename, second ?? "", context),
        assets: () =>
            getAssetCategorySuggestions(filename, second ?? "", context),
        metadata: () => [],
    };
    return handlers[root ?? ""]?.() ?? [];
}

function getDepth3Suggestions(
    filename: string,
    segments: string[],
    context: ExecutionContext,
): Suggestion[] {
    const [root, second, third] = segments;
    const handlers: Record<string, () => Suggestion[]> = {
        assets: () =>
            getAssetIdSuggestions(
                filename,
                second ?? "",
                third ?? "",
                context,
            ),
    };
    return handlers[root ?? ""]?.() ?? [];
}

function getFileSuggestions(
    token: string,
    context: ExecutionContext,
): Suggestion[] {
    const normalized = token.toLowerCase();
    const matches = fileCache.filter((file) =>
        file.toLowerCase().startsWith(normalized),
    );

    const fileSuggestions = matches.map((file) => ({
        label: file,
        type: "value" as const,
        insertText: file,
    }));

    // If we have an exact file match (or it's a known file), suggest the next level immediately
    // Only do this if token is not empty, otherwise we just list files
    const exactMatch = fileCache.find(
        (file) => file.toLowerCase() === normalized,
    );

    if (token && (exactMatch || context.resources?.hasFile(token))) {
        const fileLabel = exactMatch ?? token;
        return [...fileSuggestions, ...getRootSuggestions(fileLabel, "")];
    }

    return fileSuggestions;
}

function getRootSuggestions(
    filename: string,
    token: string | undefined,
): Suggestion[] {
    const normalized = (token ?? "").toLowerCase();

    return ROOT_KEYS.filter((key) => key.startsWith(normalized)).map((key) => {
        const isLeaf = key === "metadata";
        const insertText = isLeaf
            ? `${filename}${VIRTUAL_PATH_SEPARATOR}${key}`
            : `${filename}${VIRTUAL_PATH_SEPARATOR}${key}${VIRTUAL_PATH_SEPARATOR}`;
        let description = "Blueprints";
        if (isLeaf) description = "Module Metadata";
        if (key === "assets") description = "Assets";

        return {
            label: key,
            type: "value" as const,
            insertText,
            description,
        };
    });
}

function getBlueprintSuggestions(
    filename: string,
    token: string,
    context: ExecutionContext,
): Suggestion[] {
    const normalized = token.toLowerCase();
    const moduleData = getModule(context, filename);
    const blueprints = moduleData?.blueprints ?? {};
    const keys = moduleData
        ? Object.keys(blueprints)
        : (context.resources?.resolveModuleKeys(filename, "blueprints") ?? []);

    if (normalized && keys.some((key) => key.toLowerCase() === normalized)) {
        return [];
    }

    return keys
        .filter((key) => key.toLowerCase().startsWith(normalized))
        .map((key) => {
            const blueprint = blueprints[key] as Blueprint | undefined;
            const label = resolveBlueprintLabel(key, blueprint);

            return {
                label,
                type: "value" as const,
                insertText: `${filename}${VIRTUAL_PATH_SEPARATOR}blueprints${VIRTUAL_PATH_SEPARATOR}${key}`,
                description: label === key ? undefined : key,
            };
        });
}

function getAssetCategorySuggestions(
    filename: string,
    token: string,
    context: ExecutionContext,
): Suggestion[] {
    const normalized = token.toLowerCase();
    const moduleData = getModule(context, filename);
    const categories = moduleData ? Object.keys(moduleData.assets ?? {}) : [];

    return categories
        .filter((key) => key.toLowerCase().startsWith(normalized))
        .map((key) => ({
            label: key,
            type: "value" as const,
            insertText: `${filename}${VIRTUAL_PATH_SEPARATOR}assets${VIRTUAL_PATH_SEPARATOR}${key}${VIRTUAL_PATH_SEPARATOR}`,
            description: "Asset Category",
        }));
}

function getAssetIdSuggestions(
    filename: string,
    category: string,
    token: string,
    context: ExecutionContext,
): Suggestion[] {
    const normalized = token.toLowerCase();

    // 1. Try to get full module data to access rich metadata (tooltip/value)
    const moduleData = getModule(context, filename);
    const assets = (moduleData?.assets?.[category as keyof AssetCollection] ??
        {}) as Record<string, any>;

    // 2. Fallback to raw keys if module isn't loaded
    const keys = moduleData
        ? Object.keys(assets)
        : (context.resources?.resolveModuleKeys(filename, category) ?? []);

    if (normalized && keys.some((key) => key.toLowerCase() === normalized)) {
        return [];
    }

    return keys
        .filter((key) => {
            if (key.toLowerCase().startsWith(normalized)) return true;
            // Optional: Match against tooltip if available
            const asset = assets[key];
            if (asset?.tooltip?.toLowerCase().startsWith(normalized))
                return true;
            return false;
        })
        .map((key) => {
            const asset = assets[key];

            // 3. Resolve a rich label: Tooltip > Value (if emoji) > Key
            // This mimics the Blueprint "Label vs ID" behavior
            let label = key;
            if (asset?.tooltip) {
                label = asset.tooltip;
            } else if (asset?.type === "emoji" && asset.value) {
                label = `${asset.value} (${key})`;
            }

            return {
                label,
                type: "value" as const,
                // The insertText must always be the ID (the Key)
                insertText: `${filename}${VIRTUAL_PATH_SEPARATOR}assets${VIRTUAL_PATH_SEPARATOR}${category}${VIRTUAL_PATH_SEPARATOR}${key}`,
                // If the label isn't the key, show the key in the description
                description: label === key ? undefined : key,
            };
        });
}

function getModule(
    context: ExecutionContext,
    filename: string,
): ModuleCartridge | null {
    return context.resources?.getModule?.(filename) ?? null;
}

function resolveBlueprintLabel(
    id: string,
    blueprint: Blueprint | undefined,
): string {
    const directLabel = blueprint?.label?.toString().trim();
    if (directLabel) return directLabel;

    const displayLabel = blueprint?.components?.display?.label
        ?.toString()
        .trim();
    if (displayLabel) return displayLabel;

    return id;
}
