import { fileCache } from "../fileUtils";

const MANIFEST = "/manifest.json";

const projectRoots = (): string[] => {
    const roots = fileCache
        .filter((path) => path.endsWith(MANIFEST) || path === "manifest.json")
        .map((path) =>
            path === "manifest.json" ? "." : path.slice(0, -MANIFEST.length),
        );
    return Array.from(new Set(roots)).sort((a, b) => a.localeCompare(b));
};

const toSuggestions = (values: string[]) =>
    values.map((value) => ({
        label: value,
        type: "value" as const,
        insertText: value,
    }));

export const getProjectRootSuggestions = (args: string[]) => {
    if (args.length !== 1) return [];
    const token = args[0].toLowerCase();
    return toSuggestions(
        projectRoots().filter((root) => root.toLowerCase().startsWith(token)),
    );
};

export const getProjectManifestSuggestions = (args: string[]) => {
    if (args.length !== 1) return [];
    const token = args[0].toLowerCase();
    const manifests = projectRoots().map((root) =>
        root === "." ? "manifest.json" : `${root}/manifest.json`,
    );
    return toSuggestions(
        manifests.filter((path) => path.toLowerCase().startsWith(token)),
    );
};
