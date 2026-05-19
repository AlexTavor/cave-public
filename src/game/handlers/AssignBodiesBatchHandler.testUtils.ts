import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { readAssignmentId } from "../assignment/bodyAssignment";
import { AssignBodiesBatchHandler } from "./AssignBodiesBatchHandler";

export const runAssignBodiesBatch = (updates: any[], entities: any[]) => {
    const context = makeHandlerContext();
    entities.forEach((entity) => context.world.add(entity));
    new AssignBodiesBatchHandler().handle(
        {
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: { updates },
        } as any,
        context,
    );
    return context;
};

export const readBodyOwner = (context: any, bodyId: string) =>
    readAssignmentId(
        context.world.entities.find((entity: any) => entity.id === bodyId),
    );
