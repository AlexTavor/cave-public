export const getExtension = (path: string) => {
    const value = path.toLowerCase();
    const index = value.lastIndexOf(".");
    return index >= 0 ? value.slice(index) : "";
};

export const isManifest = (path: string) =>
    path.toLowerCase().endsWith("manifest.json");
