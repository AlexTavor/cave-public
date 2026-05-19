import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { isSemverNewer } from "./version";

export type HydrationDecision =
    | { kind: "overwrite_db_with_disk"; reason: string }
    | { kind: "keep_db"; reason: string }
    | { kind: "seed_db_from_disk"; reason: string }
    | { kind: "create_empty"; reason: string }
    | { kind: "noop"; reason: string };

export function createEmptyCartridge(): ModuleCartridge {
    return {
        metadata: { id: "game_data", name: "New Game", version: "0.0.1" },
        blueprints: {},
        config: {
            traits: {},
            habiti: {},
            understanding: {},
            settings: {
                impulse: DEFAULT_IMPULSE_CONFIG,
                game_config: DEFAULT_GAME_CONFIG,
            },
        },
        assets: {
            displays: {},
            styles: {},
            settings: { vein_network: DEFAULT_VEIN_CONFIG },
        },
    };
}

export function decideHydration(params: {
    diskData: ModuleCartridge | null;
    dbData: ModuleCartridge | undefined;
}): HydrationDecision {
    const { diskData, dbData } = params;
    if (diskData && dbData) {
        const diskVer = diskData.metadata.version;
        const dbVer = dbData.metadata.version;
        return isSemverNewer(diskVer, dbVer)
            ? {
                  kind: "overwrite_db_with_disk",
                  reason: `Disk (${diskVer}) > DB (${dbVer})`,
              }
            : { kind: "keep_db", reason: `DB (${dbVer}) >= Disk (${diskVer})` };
    }
    if (diskData) {
        return {
            kind: "seed_db_from_disk",
            reason: "DB empty; seed from disk",
        };
    }
    if (!dbData) {
        return {
            kind: "create_empty",
            reason: "No disk and no DB; create placeholder",
        };
    }
    return { kind: "noop", reason: "No disk; DB already populated" };
}

export function getDiskReadUrl(params: {
    isDev: boolean;
    sourceDir: string;
    filename: string;
}): string {
    if (params.isDev) {
        const pathParam = encodeURIComponent(
            `${params.sourceDir}/${params.filename}`,
        );
        return `/__editor/read?path=${pathParam}`;
    }
    return `/${params.filename}`;
}

export const getDiskWritePath = (params: {
    sourceDir: string;
    filename: string;
}) => `${params.sourceDir}/${params.filename}`;
