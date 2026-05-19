import { describe, expect, it } from "vitest";
import {
    appendCommandMetadata,
    patchCommandMetadataInPlace,
    readCommandCause,
    readDeadBodyPresentation,
    readKilledEntityPresentation,
    readCommandSourceEntityId,
    readCommandSourceLane,
    RuntimeCommandType,
} from "./types";

describe("commandMetadata", () => {
    it("appends metadata without mutating the original command", () => {
        // Given
        const command = {
            type: RuntimeCommandType.KILL,
            payload: { entityId: "body-1" },
        };

        // When
        const result = appendCommandMetadata(command, {
            sourceEntityId: "body-2",
        });

        // Then
        expect(result).toMatchObject({
            metadata: { sourceEntityId: "body-2" },
        });
        expect(command).not.toHaveProperty("metadata");
    });

    it("shallow merges metadata and overwrites only colliding keys", () => {
        // Given
        const command = {
            type: RuntimeCommandType.KILL,
            payload: { entityId: "body-1" },
            metadata: { cause: "purge" as const, extra: 1 },
        };

        // When
        const result = appendCommandMetadata(command, {
            cause: "starvation",
            sourceLane: "behavior_rule",
        });

        // Then
        expect(result.metadata).toEqual({
            cause: "starvation",
            extra: 1,
            sourceLane: "behavior_rule",
        });
        expect(command.metadata).toEqual({ cause: "purge", extra: 1 });
    });

    it("reads typed metadata values", () => {
        // Given
        const command = {
            type: RuntimeCommandType.KILL,
            payload: { entityId: "body-1" },
            metadata: {
                sourceEntityId: "body-9",
                sourceLane: "draft_option" as const,
                cause: "starvation" as const,
            },
        };

        // When
        const sourceEntityId = readCommandSourceEntityId(command);
        const sourceLane = readCommandSourceLane(command);
        const cause = readCommandCause(command);

        // Then
        expect(sourceEntityId).toBe("body-9");
        expect(sourceLane).toBe("draft_option");
        expect(cause).toBe("starvation");
    });

    it("patches metadata in place for handler enrichment", () => {
        const command = {
            type: RuntimeCommandType.KILL,
            payload: { entityId: "body-1" },
        };

        const result = patchCommandMetadataInPlace(command, {
            deadBodyPresentation: { x: 1, y: 2, radius: 3 },
        });
        const carrier = command as {
            metadata?: {
                deadBodyPresentation?: { x: number; y: number; radius: number };
            };
        };

        expect(result).toBe(command);
        expect(readDeadBodyPresentation(carrier)).toEqual({
            x: 1,
            y: 2,
            radius: 3,
        });
    });

    it("reads killed-entity presentation entries by id", () => {
        const command = {
            type: RuntimeCommandType.KILL,
            payload: { entityId: "body-1" },
            metadata: {
                killedEntityPresentations: [
                    { entityId: "body-1", x: 4, y: 5, radius: 6 },
                ],
            },
        };

        expect(readKilledEntityPresentation(command, "body-1")).toEqual({
            entityId: "body-1",
            x: 4,
            y: 5,
            radius: 6,
        });
        expect(
            readKilledEntityPresentation(command, "missing"),
        ).toBeUndefined();
    });
});
