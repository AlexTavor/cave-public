import { describe, expect, it } from "vitest";
import { CommandRegistry } from "./Registry";

describe("CommandRegistry comment context", () => {
    it("suppresses command suggestions when input is in a comment", () => {
        const registry = new CommandRegistry([
            {
                name: "spawn",
                description: "Spawn entity",
                usage: "spawn <id>",
                execute: async () => ({ type: "success", content: "ok" }),
            },
        ]);

        const suggestions = registry.getSuggestions("# spa");
        expect(suggestions).toEqual([]);
    });

    it("suppresses arg suggestions when command line contains #", () => {
        const registry = new CommandRegistry([
            {
                name: "spawn",
                description: "Spawn entity",
                usage: "spawn <id>",
                execute: async () => ({ type: "success", content: "ok" }),
                autocomplete: () => [{ label: "wolf", type: "value" }],
            },
        ]);

        const suggestions = registry.getSuggestions("spawn # wol");
        expect(suggestions).toEqual([]);
    });
});
