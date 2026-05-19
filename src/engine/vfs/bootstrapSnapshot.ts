import type { FetchLike } from "./persistence";

export const BOOTSTRAP_SNAPSHOT_DISK_PATH = "public/bootstrap/vfs-prod.json";

const joinPublicUrl = (baseUrl: string, path: string): string => {
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${normalizedBase}${path}`;
};

export const BOOTSTRAP_SNAPSHOT_PUBLIC_URL = joinPublicUrl(
    import.meta.env.BASE_URL,
    "bootstrap/vfs-prod.json",
);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export function assertValidBootstrapSnapshot(
    data: unknown,
): Record<string, unknown> {
    if (!isPlainObject(data)) {
        throw new Error("Bootstrap snapshot must be a non-null object.");
    }
    try {
        JSON.stringify(data);
    } catch {
        throw new Error("Bootstrap snapshot must be JSON-serializable.");
    }
    return data;
}

export async function loadBootstrapSnapshotFromPublicAsset(
    fetcher?: FetchLike<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
    const request = fetcher ?? globalThis.fetch?.bind(globalThis);
    if (!request) {
        throw new Error("Fetch is unavailable for bootstrap snapshot loading.");
    }
    const response = await request(BOOTSTRAP_SNAPSHOT_PUBLIC_URL);
    if (!response.ok) {
        throw new Error(
            `Failed to load bootstrap snapshot: ${response.status} ${response.statusText}`,
        );
    }
    return assertValidBootstrapSnapshot(await response.json());
}
