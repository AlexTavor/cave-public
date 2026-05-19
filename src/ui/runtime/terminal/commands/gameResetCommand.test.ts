import { describe, it, expect, vi } from "vitest";
import { gameResetCommand } from "./gameResetCommand";

describe("gameResetCommand", () => {
    it("calls reset and returns success", () => {
        // Given
        const resetMock = vi.fn();
        const context: any = {
            runtime: {
                getRuntime: () => ({ id: "rt" }),
                reset: resetMock,
            },
        };

        // When
        const result = gameResetCommand.execute([], context);

        // Then
        expect(result).toEqual({
            type: "success",
            content: "Runtime reset.",
        });
        expect(resetMock).toHaveBeenCalledOnce();
    });

    it("returns error when runtime is not ready", () => {
        // Given
        const context: any = { runtime: { getRuntime: () => null } };

        // When
        const result = gameResetCommand.execute([], context);

        // Then
        expect(result).toEqual({
            type: "error",
            content: "Runtime not ready.",
        });
    });

    it("returns error when runtime provider is absent", () => {
        // Given
        const context: any = {};

        // When
        const result = gameResetCommand.execute([], context);

        // Then
        expect(result).toEqual({
            type: "error",
            content: "Runtime not ready.",
        });
    });
});
