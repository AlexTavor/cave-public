import type { ModuleCartridge } from "../../data/schemas/module";
import { createEmptyCartridge, decideHydration } from "./bootstrap";
import type { PersistenceAdapter } from "./persistence";

export const hydrateLoadedCartridge = async (
    db: PersistenceAdapter<ModuleCartridge>,
    loadedCartridge: string,
    diskData: ModuleCartridge | null,
) => {
    const dbData = await db.load(loadedCartridge);
    const decision = decideHydration({ diskData, dbData }).kind;

    if (
        decision === "overwrite_db_with_disk" ||
        decision === "seed_db_from_disk"
    ) {
        if (!diskData) return;
        await db.save(loadedCartridge, diskData);
        return;
    }
    if (decision === "create_empty") {
        await db.save(loadedCartridge, createEmptyCartridge());
    }
};
