import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { Gatekeeper, ValidationError } from "./Gatekeeper";
import { ModuleLinker } from "./ModuleLinker";

const makeModule = (id: string, refs: string[] = []): ModuleCartridge => ({
    metadata: { id, name: id, version: "0.0.1" },
    blueprints: {
        [`${id}::entity`]: {
            id: `${id}::entity`,
            label: "Entity",
            tags: refs,
            components: {},
        } as any,
    },
    assets: {} as any,
});

const linker = new ModuleLinker({ readText: async () => null });

describe("Gatekeeper", () => {
    it("throws when payload references a missing id", async () => {
        const gatekeeper = new Gatekeeper(linker);
        const current = { "A.json": makeModule("A") };
        const payload = makeModule("B", ["missing::id"]);

        await expect(
            gatekeeper.validatePayload(current, "B.json", payload),
        ).rejects.toBeInstanceOf(ValidationError);
    });

    it("throws when payload has schema violations", async () => {
        const gatekeeper = new Gatekeeper(linker);
        const broken = {
            metadata: { id: "A" },
            blueprints: {},
            assets: {},
        } as any;

        await expect(
            gatekeeper.validatePayload({}, "A.json", broken),
        ).rejects.toBeInstanceOf(ValidationError);
    });

    it("passes when references and schema are valid", async () => {
        const gatekeeper = new Gatekeeper(linker);
        const current = { "A.json": makeModule("A") };
        const payload = makeModule("B", ["A::entity"]);

        await expect(
            gatekeeper.validatePayload(current, "B.json", payload),
        ).resolves.toBeUndefined();
    });
});
