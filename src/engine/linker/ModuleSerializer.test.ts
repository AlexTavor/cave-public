import { describe, expect, it } from "vitest";
import { ModuleSerializer } from "./ModuleSerializer";
import type { BlueprintV2 } from "./types";

describe("ModuleSerializer", () => {
    it("strips target namespace from ids and refs", () => {
        const blueprint: BlueprintV2 = {
            id: "content/forest::orc",
            tags: ["enemy"],
            state: {
                target: "content/forest::goblin",
                other: "content/caves::bat",
            },
        };

        const serialized = ModuleSerializer.serializeBlueprint(blueprint, {
            targetNamespace: "content/forest",
        }) as BlueprintV2;

        expect(serialized.id).toBe("orc");
        expect((serialized.state as any).target).toBe("goblin");
        expect((serialized.state as any).other).toBe("content/caves::bat");
    });

    it("keeps fq ids when namespace differs and does not mutate input", () => {
        const blueprint: BlueprintV2 & { _computed?: unknown } = {
            id: "content/forest::orc",
            state: { refs: ["content/forest::goblin", "content/caves::bat"] },
            _computed: { cache: true },
        };
        const original = JSON.stringify(blueprint);

        const serialized = ModuleSerializer.serializeBlueprint(blueprint, {
            targetNamespace: "content/caves",
        }) as Record<string, unknown>;

        expect(serialized.id).toBe("content/forest::orc");
        expect((serialized.state as any).refs[0]).toBe(
            "content/forest::goblin",
        );
        expect(serialized._computed).toBeUndefined();
        expect(JSON.stringify(blueprint)).toBe(original);
    });
});
