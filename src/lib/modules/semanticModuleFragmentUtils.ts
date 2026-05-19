export const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};

export const withMetadata = (filename: string) => ({
    metadata: {
        id: filename.replace(/^.*\//, "").replace(/\.[^/.]+$/, ""),
        name: filename.replace(/^.*\//, "").replace(/\.[^/.]+$/, ""),
        version: "0.0.1",
    },
    blueprints: {},
    assets: {},
});

export const isCaveFile = (filename: string) =>
    filename.toLowerCase().endsWith(".cave");

export const isAssetFile = (filename: string) =>
    filename.toLowerCase().endsWith(".art");

export const isDraftFile = (filename: string) =>
    filename.toLowerCase().endsWith(".draft");
