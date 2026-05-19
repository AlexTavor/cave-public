import { describe, expect, it } from "vitest";
import { evaluatePurge } from "./cave/purgeEvaluate";
import { RuntimeCommandType } from "../../engine/runtime/types";
import {
    makeBuffer,
    snap,
    makeTestPurgeConfig,
    makeWorldWithPurge,
    makeBody,
} from "./cave/purgeTestUtils";

describe("CaveSystem purge", () => {
    it("activates purge when progress threshold reached", () => {
        const config = makeTestPurgeConfig();
        const world = makeWorldWithPurge(100, false, 0);
        const buffer = makeBuffer();

        evaluatePurge(snap([world]), buffer, 1, config);

        const cave = buffer.commands.find(
            (c) => c.type === RuntimeCommandType.UPDATE_CAVE,
        );
        expect((cave as any).payload.purge.isActive).toBe(true);
        expect((cave as any).payload.purge.nextKillTimer).toBeGreaterThan(0);

        const progressWrites = buffer.commands.filter(
            (c) =>
                c.type === RuntimeCommandType.UPDATE_STATE &&
                c.payload.key === "purge_progress" &&
                c.payload.value !== undefined,
        );
        expect(progressWrites).toHaveLength(0);
    });

    it("kills a body when timer expires", () => {
        const config = makeTestPurgeConfig();
        const world = makeWorldWithPurge(0, true, 0.1);
        const bodies = [makeBody("b1"), makeBody("b2"), makeBody("b3")];
        const buffer = makeBuffer();

        evaluatePurge(snap([world, ...bodies]), buffer, 2000, config);

        const kills = buffer.commands.filter(
            (c) => c.type === RuntimeCommandType.KILL,
        );
        expect(kills).toHaveLength(1);
        expect(["b1", "b2", "b3"]).toContain(
            (kills[0] as any).payload.entityId,
        );

        const timerCmd = buffer.commands.find(
            (c) => c.type === RuntimeCommandType.UPDATE_CAVE,
        );
        expect((timerCmd as any).payload.purge.nextKillTimer).toBeGreaterThan(
            0,
        );
    });

    it("decrements timer without killing when timer > 0", () => {
        const config = makeTestPurgeConfig();
        const world = makeWorldWithPurge(0, true, 5);
        const buffer = makeBuffer();

        evaluatePurge(snap([world]), buffer, 1000, config);

        const cave = buffer.commands.find(
            (c) => c.type === RuntimeCommandType.UPDATE_CAVE,
        );
        expect((cave as any).payload.purge.nextKillTimer).toBe(4);
        const kills = buffer.commands.filter(
            (c) => c.type === RuntimeCommandType.KILL,
        );
        expect(kills).toHaveLength(0);
    });

    it("deactivates purge when no bodies remain", () => {
        const config = makeTestPurgeConfig();
        const world = makeWorldWithPurge(0, true, 0);
        const buffer = makeBuffer();

        evaluatePurge(snap([world]), buffer, 1, config);

        const cave = buffer.commands.find(
            (c) => c.type === RuntimeCommandType.UPDATE_CAVE,
        );
        expect((cave as any).payload.purge.isActive).toBe(false);
        const kills = buffer.commands.filter(
            (c) => c.type === RuntimeCommandType.KILL,
        );
        expect(kills).toHaveLength(0);
    });

    it("produces deterministic kill targets", () => {
        const config = makeTestPurgeConfig();
        const bodies = Array.from({ length: 10 }, (_, i) =>
            makeBody(`body_${i}`),
        );
        const worldA = makeWorldWithPurge(0, true, 0.1);
        const worldB = makeWorldWithPurge(0, true, 0.1);
        const bufferA = makeBuffer();
        const bufferB = makeBuffer();

        evaluatePurge(snap([worldA, ...bodies]), bufferA, 2000, config);
        evaluatePurge(snap([worldB, ...bodies]), bufferB, 2000, config);

        const killA = bufferA.commands.find(
            (c) => c.type === RuntimeCommandType.KILL,
        );
        const killB = bufferB.commands.find(
            (c) => c.type === RuntimeCommandType.KILL,
        );
        expect((killA as any).payload.entityId).toBe(
            (killB as any).payload.entityId,
        );
    });
});
