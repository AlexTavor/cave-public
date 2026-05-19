import { describe, expect, it } from "vitest";
import { assertValidProjectModules } from "./projectManifest";

describe("projectManifest semantic module errors", () => {
    it("includes source file path for schema validation errors", async () => {
        const vfs = {
            readFile: async (path: string) => {
                if (!path.endsWith("broken.bp")) return null;
                return {
                    id: "broken",
                    components: {
                        behavior: {
                            rules: [
                                { conditions: [] },
                                {
                                    conditions: [
                                        {
                                            tokens: [
                                                { type: "field", v: "a" },
                                                { type: "op", v: "+" },
                                                { type: "val", v: "x" },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                };
            },
            readText: async () => null,
        } as any;

        await expect(
            assertValidProjectModules(vfs, "project", ["broken.bp"]),
        ).rejects.toThrow(/project\/broken\.bp/);
    });
});
