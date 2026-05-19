import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { upsertModuleInState } from "./moduleStore.reducer";
import {
    createBlueprint,
    createCartridge,
} from "../../../engine/test/factories";

describe("ui/devtools/state/moduleStore.reducer", () => {
    it("upsertModuleInState updates modules + indexes together", () => {
        const prev = { modules: {}, indexes: {} } as any;
        const mod: ModuleCartridge = createCartridge("m", {
            metadata: { id: "m", name: "M", version: "0.0.1" },
            blueprints: {
                entity_a: createBlueprint("entity_a", {
                    label: "Alpha",
                    components: {
                        display: { label: "Alpha", display_key: "unknown" },
                    },
                }),
            },
        });

        const next = upsertModuleInState(prev, "game_data.json", mod);
        expect(next.modules["game_data.json"]).toBe(mod);
        expect(next.indexes["game_data.json"].labelToId.alpha).toBe("entity_a");
    });
});
