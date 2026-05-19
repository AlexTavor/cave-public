import type { RuntimeEntity } from "../runtime/types";
import type { EvaluationContext } from "./JsonLogicAdapter.types";

export const createEntityFacade = (
    entity: RuntimeEntity,
    assignmentMap?: Record<string, string>,
): RuntimeEntity =>
    new Proxy(entity, {
        get(target, prop, receiver) {
            if (typeof prop === "symbol") {
                return Reflect.get(target, prop, receiver);
            }
            if (prop === "assignment") {
                const parentId = assignmentMap?.[target.id ?? ""] ?? null;
                return { parentId };
            }
            return Reflect.get(target, prop, receiver);
        },
    });

export const createLogicDataFacade = <T extends object>(
    baseData: T,
    context: EvaluationContext,
): T =>
    new Proxy(baseData, {
        get(target, prop, receiver) {
            if (prop in target) {
                return Reflect.get(target, prop, receiver);
            }
            if (typeof prop === "string" && context.snapshot) {
                const entity = context.snapshot.getEntity(prop);
                if (entity) {
                    return createEntityFacade(entity, context.assignmentMap);
                }
            }
            return undefined;
        },
    });
