import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { createEntity } from "../../engine/test/factories";
import { UpdateTraitsBatchHandler } from "./UpdateTraitsBatchHandler";

describe("UpdateTraitsBatchHandler", () => {
    it("writes normalized unique-by-id traits sorted by id", () => {
        const context = makeHandlerContext();
        context.world.add(createEntity("e1"));

        const handler = new UpdateTraitsBatchHandler();
        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_TRAITS_BATCH,
                payload: {
                    updates: [
                        {
                            entityId: "e1",
                            traits: [
                                { id: "z_trait" },
                                { id: "a_trait" },
                                { id: "z_trait" },
                            ],
                        },
                    ],
                },
            },
            context,
        );

        const entity = context.world.entities.find((e) => e.id === "e1") as any;
        expect(entity.traits).toEqual([{ id: "a_trait" }, { id: "z_trait" }]);
    });

    it("logs error for missing entity without throwing", () => {
        const context = makeHandlerContext();
        const handler = new UpdateTraitsBatchHandler();

        expect(() =>
            handler.handle(
                {
                    type: RuntimeCommandType.UPDATE_TRAITS_BATCH,
                    payload: {
                        updates: [
                            {
                                entityId: "missing",
                                traits: [{ id: "x" }],
                            },
                        ],
                    },
                },
                context,
            ),
        ).not.toThrow();

        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("missing"),
        );
    });
});
