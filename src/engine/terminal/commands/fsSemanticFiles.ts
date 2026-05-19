const semanticExtensions = [".cave", ".draft", ".art", ".bp", ".cvs"];

export const SOURCE_ROOT = "src/data/raw";

export const isSupportedFsFile = (path: string): boolean =>
    path.endsWith("manifest.json") ||
    semanticExtensions.some((ext) => path.endsWith(ext));
