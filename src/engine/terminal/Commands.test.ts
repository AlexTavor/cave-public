import { describe, it, expect, vi } from "vitest";

// Mock the VFS to avoid IndexedDB dependencies in Node environment
// This MUST happen before importing ./commands
vi.mock("../vfs/FileSystem", () => ({
    vfs: {
        listFiles: vi.fn().mockResolvedValue(["core.json", "test.json"]),
        readFile: vi.fn().mockResolvedValue(null),
        writeFile: vi.fn(),
        deleteFile: vi.fn(),
        init: vi.fn(),
    },
}));

import { STANDARD_COMMANDS } from "./commands";
import { CommandRegistry } from "../../lib/terminal/Registry";
import { CommandResult } from "../../lib/terminal/types";

/**
 * META-TESTS
 * These tests do not test the engine logic.
 * They test the actual CONTENT (commands) to ensure developer sanity.
 */

describe("Terminal Command Runtime Analysis", () => {
    // We create a registry populated with the actual commands for context testing
    const runtimeRegistry = new CommandRegistry(STANDARD_COMMANDS);

    describe("Static Analysis (Schema Integrity)", () => {
        STANDARD_COMMANDS.forEach((cmd) => {
            it(`[${cmd.name}] should have a valid schema`, () => {
                // 1. Name conventions
                expect(cmd.name).toBeTruthy();
                expect(cmd.name).toMatch(/^[a-z0-9-_]+$/); // Enforce lowercase slug format

                // 2. Helpfulness
                expect(cmd.description).toBeTruthy();
                expect(cmd.description.length).toBeGreaterThan(10); // Enforce descriptive text
                expect(cmd.usage).toBeTruthy();
                expect(cmd.usage).toContain(cmd.name); // Usage should probably contain the command name
            });
        });

        it("should not have duplicate command names in the bundle", () => {
            const names = STANDARD_COMMANDS.map((c) => c.name);
            const unique = new Set(names);
            expect(unique.size).toBe(names.length);
        });
    });

    describe("Smoke Tests (Execution Safety)", () => {
        STANDARD_COMMANDS.forEach((cmd) => {
            it(`[${cmd.name}] should survive execution with empty args`, async () => {
                // We execute the command with NO arguments.
                // A well-written command should check args.length or provide defaults,
                // NEVER crash the JS runtime.

                let result: CommandResult | undefined;
                let error: unknown;

                try {
                    result = await cmd.execute([], {
                        registry: runtimeRegistry,
                    });
                } catch (e: unknown) {
                    error = e;
                }

                // Assert it didn't crash
                expect(error).toBeUndefined();

                // Assert it returned a valid result structure
                expect(result).toBeDefined();
                expect(result?.type).toMatch(
                    /^(success|error|info|output|input)$/,
                );
                expect(result?.content).toBeDefined();
            });

            it(`[${cmd.name}] should survive execution with garbage args`, async () => {
                // Fuzz testing with nonsense
                const garbageArgs = ["!@#$", "undefined", "null", "      "];

                let error: unknown;
                try {
                    await cmd.execute(garbageArgs, {
                        registry: runtimeRegistry,
                    });
                } catch (e: unknown) {
                    error = e;
                }

                expect(error).toBeUndefined();
            });
        });
    });

    describe("Specific Command Logic Checks", () => {
        // Here we test specific logic of specific commands if needed

        it("help command should return list when no args provided", async () => {
            const help = STANDARD_COMMANDS.find((c) => c.name === "help")!;
            const result = await help.execute([], {
                registry: runtimeRegistry,
            });

            expect(result.content).toContain("Available commands");
            expect(result.content).toContain("help");
        });

        it("help command should autocomplete other command names", () => {
            const help = STANDARD_COMMANDS.find((c) => c.name === "help")!;

            // This test verifies the fix: help now has access to the registry for autocomplete
            if (help.autocomplete) {
                const suggestions = help.autocomplete([""], {
                    registry: runtimeRegistry,
                });
                expect(suggestions.length).toBeGreaterThan(0);
                const helpSuggestion = suggestions.find(
                    (s) => s.label === "help",
                );
                expect(helpSuggestion).toBeDefined();
            } else {
                throw new Error("Help command missing autocomplete handler");
            }
        });

        it("clear command should return empty output", async () => {
            const clear = STANDARD_COMMANDS.find((c) => c.name === "clear")!;
            const result = await clear.execute([], {
                registry: runtimeRegistry,
                terminal: { clearLogs: vi.fn() },
            });

            expect(result.type).toBe("success");
        });
    });
});
