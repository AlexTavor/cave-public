import { describe, it, expect, vi, beforeEach } from "vitest";
import { transferStartCommand } from "./transferCommands";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import { Runtime } from "../../../../engine/runtime/Runtime";

// Mock Dependencies
const mockEnqueue = vi.fn();
const mockGetEntities = vi.fn();

const mockRuntime = {
    commands: { enqueue: mockEnqueue },
    getEntities: mockGetEntities,
} as unknown as Runtime;

// Context for autocomplete
const mockContext = {
    runtime: {
        getActiveEntityIds: vi.fn(() => ["source_a", "target_b"]),
        getLoadedBlueprintIds: vi.fn(),
        getRuntime: vi.fn(() => mockRuntime),
    },
    registry: {} as any,
};

describe("transferStartCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetEntities.mockReturnValue([]);
    });

    describe("execute", () => {
        it("fails if arguments are missing", async () => {
            const result = await transferStartCommand.execute(
                ["source"],
                mockContext,
            );
            expect(result.type).toBe("error");
            expect(result.content).toContain("Missing arguments");
        });

        it("fails if amount is invalid", async () => {
            const result = await transferStartCommand.execute(
                ["source", "target", "wood", "lots"],
                mockContext,
            );
            expect(result.type).toBe("error");
            expect(result.content).toContain("Invalid quantity");
        });

        it("fails if amount is negative", async () => {
            const result = await transferStartCommand.execute(
                ["source", "target", "wood", "-5"],
                mockContext,
            );
            expect(result.type).toBe("error");
            expect(result.content).toContain("positive");
        });

        it("fails if source entity does not exist", async () => {
            mockGetEntities.mockReturnValue([]);
            const result = await transferStartCommand.execute(
                ["ghost", "target", "wood", "10"],
                mockContext,
            );
            expect(result.type).toBe("error");
            expect(result.content).toContain("Source entity 'ghost' not found");
        });

        it("fails if resource does not exist on source", async () => {
            mockGetEntities.mockReturnValue([
                { id: "source", state: { food: { value: 10 } } },
            ]);
            const result = await transferStartCommand.execute(
                ["source", "target", "wood", "10"],
                mockContext,
            );
            expect(result.type).toBe("error");
            expect(result.content).toContain(
                "does not possess resource 'wood'",
            );
        });

        it("fails if source has insufficient funds", async () => {
            mockGetEntities.mockReturnValue([
                { id: "source", state: { wood: { value: 5 } } },
            ]);
            const result = await transferStartCommand.execute(
                ["source", "target", "wood", "10"],
                mockContext,
            );
            expect(result.type).toBe("error");
            expect(result.content).toContain("Insufficient funds");
            expect(result.content).toContain("has 5 wood");
        });

        it("queues transfer command on valid input", async () => {
            mockGetEntities.mockReturnValue([
                { id: "source", state: { wood: { value: 100 } } },
            ]);

            const result = await transferStartCommand.execute(
                ["source", "target", "wood", "50"],
                mockContext,
            );

            expect(result.type).toBe("success");
            expect(mockEnqueue).toHaveBeenCalledWith({
                type: RuntimeCommandType.TRANSFER_ASSETS,
                payload: {
                    sourceId: "source",
                    targetId: "target",
                    payload: { wood: 50 },
                },
            });
        });
    });

    describe("autocomplete", () => {
        it("suggests entity IDs for 1st and 2nd arguments", () => {
            // Arg 1: Source
            const srcSuggestions = transferStartCommand.autocomplete!(
                ["s"],
                mockContext,
            );
            expect(srcSuggestions).toHaveLength(1);
            expect(srcSuggestions[0].label).toBe("source_a");

            // Arg 2: Target
            const tgtSuggestions = transferStartCommand.autocomplete!(
                ["source_a", "t"],
                mockContext,
            );
            expect(tgtSuggestions).toHaveLength(1);
            expect(tgtSuggestions[0].label).toBe("target_b");
        });

        it("suggests resources from source entity for 3rd argument", () => {
            mockGetEntities.mockReturnValue([
                { id: "source_a", state: { wood: {}, food: {} } },
            ]);

            const suggestions = transferStartCommand.autocomplete!(
                ["source_a", "target_b", ""],
                mockContext,
            );

            expect(suggestions).toHaveLength(2);
            expect(suggestions.map((s) => s.label)).toEqual(
                expect.arrayContaining(["wood", "food"]),
            );
        });

        it("handles missing source entity gracefully during autocomplete", () => {
            mockGetEntities.mockReturnValue([]);
            const suggestions = transferStartCommand.autocomplete!(
                ["ghost", "target_b", ""],
                mockContext,
            );
            expect(suggestions).toHaveLength(0);
        });
    });
});
