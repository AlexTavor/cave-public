import { describe, expect, it } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import {
    RuntimeCommandType,
    type RuntimeCommand,
} from "../../../engine/runtime/types";
import { evaluatePurge } from "./purgeEvaluate";

describe("evaluatePurge", () => {
    it("stamps purge kills and still increments the purge counter", () => {
        // Given
        const commands: RuntimeCommand[] = [];
        const snapshot = new Snapshot(
            [
                {
                    id: "sys_world",
                    cave: { purge: { isActive: true, nextKillTimer: 0 } },
                    state: {
                        purge_progress: { value: 100, max: 100 },
                        cave_evt_purge_kill: { value: 0 },
                    },
                },
                { id: "body-1", tags: ["body"], body: { health: 1 } },
            ],
            { getBody: () => undefined } as any,
        );
        const config = {
            purge: {
                killIntervalSeconds: { min: 1, max: 2 },
                maxProgress: 100,
            },
        } as any;

        // When
        evaluatePurge(
            snapshot,
            {
                enqueue: (command: RuntimeCommand) => commands.push(command),
                drain: () => [],
                clear: () => {},
                size: () => commands.length,
            } as any,
            16,
            config,
        );

        // Then
        expect(commands).toContainEqual({
            type: RuntimeCommandType.KILL,
            payload: { entityId: "body-1" },
            metadata: { cause: "purge" },
        });
        expect(commands).toContainEqual({
            type: RuntimeCommandType.ADJUST_STATE,
            payload: {
                entityId: "sys_world",
                key: "cave_evt_purge_kill",
                delta: 1,
            },
        });
    });

    it("enqueues purge_began facts when purge activates", () => {
        const commands: RuntimeCommand[] = [];
        const snapshot = new Snapshot(
            [
                {
                    id: "sys_world",
                    cave: { purge: { isActive: false, nextKillTimer: 0 } },
                    state: { purge_progress: { value: 100, max: 100 } },
                },
            ],
            { getBody: () => undefined } as any,
        );

        evaluatePurge(
            snapshot,
            {
                enqueue: (command: RuntimeCommand) => commands.push(command),
            } as any,
            16,
            {
                purge: {
                    killIntervalSeconds: { min: 1, max: 2 },
                    maxProgress: 100,
                },
            } as any,
        );

        expect(commands).toContainEqual({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "run",
                factType: "purge_began",
                factAbout: "world",
                delta: 1,
            },
        });
    });
});
