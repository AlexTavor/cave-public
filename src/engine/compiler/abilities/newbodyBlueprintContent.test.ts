import { describe, expect, it } from "vitest";
import snapshot from "../../../../public/bootstrap/vfs-prod.json";

const files = structuredClone(snapshot as unknown as Record<string, unknown>);
const source = (path: string) => {
    const file = structuredClone(files[path]) as any;
    if (!file?.blueprints) return file;
    const blueprintId = file.metadata?.id ?? Object.keys(file.blueprints)[0];
    return file.blueprints[blueprintId];
};

describe("newbody blueprint content", () => {
    it("keeps bootstrap upkeep sourcing on the body provider tag", () => {
        const upkeep = source("example/modules/newbody.bp")._editor.abilities
            .upkeep as Array<any>;

        expect(
            upkeep.find((entry) => entry.resource === "food")?.requestSource,
        ).toBe("tag:body_provider");
        expect(
            upkeep.find((entry) => entry.resource === "heat")?.requestSource,
        ).toBe("tag:body_provider");
    });
});
