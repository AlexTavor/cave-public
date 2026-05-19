import { describe, expect, it, vi } from "vitest";

const { resolveContention } = vi.hoisted(() => ({
    resolveContention: vi.fn(() => []),
}));

vi.mock("./contention/ContentionResolver", () => ({ resolveContention }));

import { enqueueCollectedCommands } from "./runtimeCollectCommands";
import { RuntimeCommandType } from "./types";

const makeContext = () => {
    const enqueue = vi.fn();
    const getSortedEntities = vi.fn(() => []);

    return {
        getSortedEntities,
        impulseEngine: {},
        blueprints: {},
        commandContext: { cartridge: { blueprints: {} } },
        state: { status: "running" },
        commandsManager: { enqueue },
        enqueue,
        getSortedEntitiesMock: getSortedEntities,
    } as any;
};

describe("enqueueCollectedCommands", () => {
    it("skips contention snapshot work when there are no commands", () => {
        enqueueCollectedCommands(makeContext(), [], {} as any);
        expect(resolveContention).not.toHaveBeenCalled();
    });

    it("skips contention resolution for non-transfer commands", () => {
        const context = makeContext();
        const command = { type: RuntimeCommandType.UPDATE_STATE, payload: {} };

        enqueueCollectedCommands(context, [command] as any, {} as any);

        expect(resolveContention).not.toHaveBeenCalled();
        expect(context.enqueue).toHaveBeenCalledWith(command);
    });

    it("reuses the provided snapshot for contention resolution", () => {
        const context = makeContext();
        const snapshot = { getEntity: vi.fn() };
        const command = {
            type: RuntimeCommandType.TRANSFER_ASSETS,
            payload: { targetId: "target-1", transfers: [] },
        };

        enqueueCollectedCommands(context, [command] as any, snapshot as any);

        expect(resolveContention).toHaveBeenCalledWith(
            [command],
            snapshot,
            expect.any(Function),
        );
        expect(context.getSortedEntitiesMock).not.toHaveBeenCalled();
    });
});
