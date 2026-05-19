import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { FactsSystem } from "./FactsSystem";

describe("FactsSystem processing facts", () => {
    it("updates processing_ongoing even when active_bodies is unchanged", () => {
        const commands: any[] = [];
        new FactsSystem(() => 1).tick(
            new Snapshot(
                [
                    {
                        id: "sys_world",
                        run: {
                            active_bodies: { world: 1 },
                            processing_ongoing: { world: 0 },
                        },
                    },
                    { id: "body-1", body: {} },
                    {
                        id: "pool",
                        state: { processing_absorbs_habiti: { value: true } },
                        assignment: { assignedIds: ["body-1"] },
                    },
                ],
                { getBody: () => undefined } as any,
            ),
            { enqueue: (command: unknown) => commands.push(command) } as any,
            1000,
        );

        expect(commands).toContainEqual({
            type: "ADJUST_FACT",
            payload: {
                scope: "run",
                factType: "processing_ongoing",
                factAbout: "world",
                delta: 1,
            },
        });
    });
});