import type { ModuleCartridge } from "../../data/schemas/module";
import { getDiskReadUrl } from "./bootstrap";
import type { FetchLike } from "./persistence";

interface FetchDiskParams {
    fetcher: FetchLike<ModuleCartridge>;
    filename: string;
    isDefaultFetcher: boolean;
    isDev: boolean;
    loadedCartridge: string;
    sourcePath: string;
}

export const fetchDiskData = async (
    params: FetchDiskParams,
): Promise<ModuleCartridge | string | null> => {
    if (import.meta.env.MODE === "test" && params.isDefaultFetcher) return null;
    if (
        params.isDefaultFetcher &&
        params.filename === params.loadedCartridge &&
        params.filename === "game_data.json"
    ) {
        return null;
    }
    const url = getDiskReadUrl({
        isDev: params.isDev,
        sourceDir: params.sourcePath,
        filename: params.filename,
    });
    const fetchUrl =
        !params.isDefaultFetcher || /^https?:\/\//.test(url)
            ? url
            : new URL(
                  url,
                  globalThis.location?.origin ?? "http://localhost",
              ).toString();
    try {
        const response = await params.fetcher(fetchUrl);
        if (!response.ok) return null;
        return params.filename.toLowerCase().endsWith(".json")
            ? await response.json()
            : await response.text();
    } catch {
        return null;
    }
};

export const postJsonToEditor = async (
    fetcher: FetchLike<ModuleCartridge>,
    path: string,
    content: Record<string, unknown>,
) => {
    const response = await fetcher("/__editor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
    });
    if (!response.ok) {
        throw new Error(
            `/__editor/save failed: ${response.status} ${await response.text()}`,
        );
    }
};
