import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import { BehaviorSystem } from "../../runtime/systems/BehaviorSystem";
import { Snapshot } from "../../runtime/Snapshot";
import { RuntimeCommandType } from "../../runtime/types";

const compileBody = () => {
    const blueprint = createBlueprint("body", {
        _editor: {
            abilities: {
                storage: [
                    {
                        resource: "food",
                        capacity: { base: 10, perBody: 0, multPerBody: 0 },
                        entropy: { base: 0, perBody: 0, multPerBody: 0 },
                        visible: true,
                        allowDeposit: true,
                        allowWithdraw: true,
                        priority: 0,
                    },
                ],
                upkeep: [
                    {
                        resource: "food",
                        rate: { base: 1, perBody: 0, multPerBody: 0 },
                        failureTrait: "starving",
                        autoRequest: false,
                    },
                ],
            },
        } as any,
    });
    return new CompilerService().compile(blueprint).components;
};

const run = (entity: any, extra: any[] = []) => {
    const commands: any[] = [];
    new BehaviorSystem().tick(
        new Snapshot(
            [{ id: "sys_world", state: {} } as any, ...extra, entity],
            { getBody: () => undefined } as any,
        ),
        {
            enqueue: (c: any) => commands.push(c),
            drain: () => [],
            clear: () => undefined,
            size: () => commands.length,
        },
        20,
    );
    return commands.find((c) => c.type === RuntimeCommandType.ADJUST_STATE);
};

describe("upkeep on excluded bodies", () => {
    it("still consumes upkeep for a locked body", () => {
        const entity = {
            id: "body_1",
            ...compileBody(),
            state: {
                food: { value: 5, max: 10, visible: true },
                upkeep_food_demand_0: { value: 1, visible: false },
                flag_locked: { value: true },
            },
        } as any;
        const command = run(entity);
        expect(command?.payload).toMatchObject({
            entityId: "body_1",
            key: "food",
            delta: -1,
        });
    });

    it("still consumes upkeep for an assigned body", () => {
        const entity = {
            id: "body_2",
            ...compileBody(),
            state: {
                food: { value: 5, max: 10, visible: true },
                upkeep_food_demand_0: { value: 1, visible: false },
            },
        } as any;
        const command = run(entity, [
            { id: "station", assignment: { assignedIds: ["body_2"] } } as any,
        ]);
        expect(command?.payload).toMatchObject({
            entityId: "body_2",
            key: "food",
            delta: -1,
        });
    });
});
