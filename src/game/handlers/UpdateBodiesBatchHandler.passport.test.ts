import { describe, expect, it } from "vitest";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { UpdateBodiesBatchHandler } from "./UpdateBodiesBatchHandler";

describe("UpdateBodiesBatchHandler passport merge", () => {
    it("merges passport patches without losing existing fields", () => {
        const entity = {
            id: "body-1",
            body: { passport: { portraitIcon: "worker", glyphKey: "sigil" } },
        } as any;
        new UpdateBodiesBatchHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_BODIES_BATCH,
                payload: {
                    updates: [
                        {
                            entityId: "body-1",
                            passport: {
                                identitySerial: 3,
                                name: "Alden Briarson",
                            },
                        },
                    ],
                },
            } as any,
            {
                world: { entities: [entity] },
                telemetry: { log: () => {} },
            } as any,
        );
        expect(entity.body.passport).toEqual({
            portraitIcon: "worker",
            glyphKey: "sigil",
            identitySerial: 3,
            name: "Alden Briarson",
        });
    });
});
