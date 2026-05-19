import { describe, expect, it } from "vitest";
import { buildTextRegistry } from "./buildTextRegistry";
import {
    textRegistryDraftsByFile,
    textRegistryOwnerTypes,
} from "./buildTextRegistry.testData";

describe("buildTextRegistry", () => {
    it("extracts whitelisted text fields in deterministic manifest order", () => {
        const blocks = buildTextRegistry(textRegistryDraftsByFile as any, [
            "alpha.bp",
            "beta.draft",
            "gamma.cave",
        ]);
        expect(blocks.map((block) => block.ownerType)).toEqual(
            textRegistryOwnerTypes,
        );
        expect(
            blocks
                .find((block) => block.ownerType === "guidance")
                ?.fields.map((field) => field.label),
        ).toEqual(["text"]);
        expect(
            blocks
                .find((block) => block.ownerType === "habitus")
                ?.fields.map((field) => field.label),
        ).toEqual(["label", "description", "summary", "effect[1].description"]);
        expect(
            blocks
                .find((block) => block.ownerType === "understanding")
                ?.fields.map((field) => field.label),
        ).toEqual(["label", "description", "effect[1].description"]);
        expect(
            blocks
                .flatMap((block) => block.fields.map((field) => field.path))
                .some(
                    (path) =>
                        path.includes("susDisplays") || path.includes("bars"),
                ),
        ).toBe(false);
    });
});
