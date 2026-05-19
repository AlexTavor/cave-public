import { describe, expect, it } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { resolveRuntimeNotificationEvents } from "./resolveRuntimeNotificationEvents";

const makeSnapshot = (entities: any[], state: Record<string, number> = {}) =>
    new Snapshot(
        [
            {
                id: "sys_world",
                state: Object.fromEntries(
                    Object.entries(state).map(([key, value]) => [
                        key,
                        { value },
                    ]),
                ),
            },
            ...entities,
        ],
        { getBody: () => undefined } as any,
    );

describe("resolveRuntimeNotificationEvents", () => {
    it("emits body, death, starvation, purge, and level-up events", () => {
        // Given
        const prev = makeSnapshot(
            [
                { id: "body-2", blueprintId: "body_bp", body: {} },
                { id: "body-3", blueprintId: "body_bp", body: {} },
                { id: "body-4", blueprintId: "body_bp", body: {} },
            ],
            {},
        );
        const current = makeSnapshot(
            [{ id: "body-1", blueprintId: "body_bp", body: {} }],
            {},
        );
        const commands = [
            {
                type: RuntimeCommandType.SPAWN,
                payload: { id: "body-1", blueprintId: "body_bp" },
            },
            {
                type: RuntimeCommandType.KILL,
                payload: { entityId: "body-2" },
                metadata: { cause: "starvation" },
            },
            {
                type: RuntimeCommandType.KILL,
                payload: { entityId: "body-3" },
            },
            {
                type: RuntimeCommandType.KILL,
                payload: { entityId: "body-4" },
                metadata: { cause: "purge" },
            },
            {
                type: RuntimeCommandType.UPDATE_BODIES_BATCH,
                payload: {
                    updates: [
                        { entityId: "body-1", level: 4 },
                        { entityId: "body-2", level: 4 },
                    ],
                },
            },
        ] as any;

        // When
        const result = resolveRuntimeNotificationEvents(
            commands,
            prev,
            current,
        );

        // Then
        expect(result).toEqual(
            expect.arrayContaining([
                { kind: "body_added", aggregationKey: "body_added", count: 1 },
                { kind: "body_died", aggregationKey: "body_died", count: 1 },
                {
                    kind: "body_starved",
                    aggregationKey: "body_starved",
                    count: 1,
                },
                {
                    kind: "body_purge_kill",
                    aggregationKey: "body_purge_kill",
                    count: 1,
                },
                {
                    kind: "body_level_up",
                    aggregationKey: "body_level_up:4",
                    count: 2,
                    level: 4,
                },
            ]),
        );
    });
});
