import { describe, it, expect, vi, beforeEach } from "vitest";
import { composeCommands } from "./composeCommands";
import { CommandRegistry } from "./Registry";
import { CommandDefinition } from "./types";

// Mock Command Factory
const createMockCommand = (name: string): CommandDefinition => ({
    name,
    description: `Description for ${name}`,
    usage: `${name} [args]`,
    execute: vi
        .fn()
        .mockResolvedValue({ type: "success", content: "Executed" }),
});

describe("CommandRegistry (Unit)", () => {
    let registry: CommandRegistry;

    beforeEach(() => {
        registry = new CommandRegistry();
    });

    describe("Registration", () => {
        it("should register a command successfully", () => {
            const cmd = createMockCommand("test");
            registry.register(cmd);
            expect(registry.getCommand("test")).toBe(cmd);
        });

        it("should warn when overwriting a command", () => {
            const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const cmd1 = createMockCommand("test");
            const cmd2 = createMockCommand("test");

            registry.register(cmd1);
            registry.register(cmd2);

            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining("Overwriting command"),
            );
            expect(registry.getCommand("test")).toBe(cmd2);
            spy.mockRestore();
        });

        it("should return all registered commands", () => {
            registry.register(createMockCommand("alpha"));
            registry.register(createMockCommand("beta"));

            const all = registry.getAllCommands();
            expect(all).toHaveLength(2);
            expect(all.map((c) => c.name)).toEqual(
                expect.arrayContaining(["alpha", "beta"]),
            );
        });
    });

    describe("Execution", () => {
        it("should execute a valid command", async () => {
            const cmd = createMockCommand("ping");
            registry.register(cmd);

            const result = await registry.execute("ping arg1 arg2");

            expect(cmd.execute).toHaveBeenCalledWith(
                ["arg1", "arg2"],
                expect.objectContaining({ registry }), // Ensure Registry is injected
            );
            expect(result).toEqual({ type: "success", content: "Executed" });
        });

        it("should handle unknown commands gracefully", async () => {
            const result = await registry.execute("unknown_cmd");

            expect(result.type).toBe("error");
            expect(result.content).toContain("Unknown command");
        });

        it("should handle execution errors within commands", async () => {
            const cmd = createMockCommand("crash");
            cmd.execute = vi.fn().mockRejectedValue(new Error("Boom!"));
            registry.register(cmd);

            const result = await registry.execute("crash");

            expect(result.type).toBe("error");
            expect(result.content).toContain("Execution failed: Boom!");
        });

        it("should handle empty input", async () => {
            const result = await registry.execute("   ");
            expect(result.type).toBe("error");
            expect(result.content).toBe("Empty command");
        });

        it("maps vfs.makeFile alias to makefile", async () => {
            const cmd = createMockCommand("makefile");
            registry.register(cmd);
            const result = await registry.execute("vfs.makeFile test.bp");
            expect(cmd.execute).toHaveBeenCalledWith(
                ["test.bp"],
                expect.objectContaining({ registry }),
            );
            expect(result.type).toBe("success");
        });
    });

    describe("Autocomplete / Suggestions", () => {
        it("should suggest commands based on partial input", () => {
            registry.register(createMockCommand("help"));
            registry.register(createMockCommand("history"));
            registry.register(createMockCommand("clear"));

            const suggestions = registry.getSuggestions("h");

            expect(suggestions).toHaveLength(2);
            expect(suggestions[0].label).toBe("help");
            expect(suggestions[1].label).toBe("history");
        });

        it("should delegate to command autocomplete when command name matches", () => {
            const cmd = createMockCommand("git");
            // Mock autocomplete to return a dummy value
            cmd.autocomplete = vi
                .fn()
                .mockReturnValue([{ label: "commit", type: "value" }]);
            registry.register(cmd);

            const result = registry.getSuggestions("git c");

            // FIXED: Expect the context object as the second argument
            expect(cmd.autocomplete).toHaveBeenCalledWith(
                ["c"],
                expect.objectContaining({ registry }),
            );

            expect(result).toHaveLength(1);
            expect(result[0].label).toBe("commit");
        });

        it("should return empty suggestions if command has no autocomplete handler", () => {
            const cmd = createMockCommand("simple");
            // No autocomplete method
            registry.register(cmd);

            const result = registry.getSuggestions("simple args");
            expect(result).toEqual([]);
        });
    });
});

describe("composeCommands", () => {
    it("keeps the first definition for duplicate command names", () => {
        const first = createMockCommand("test");
        const second = createMockCommand("test");
        const third = createMockCommand("other");

        expect(composeCommands([first], [second, third])).toEqual([
            first,
            third,
        ]);
    });
});

