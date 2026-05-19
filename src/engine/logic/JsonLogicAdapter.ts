import jsonLogic from "json-logic-js";
import type { LogicRule } from "../../data/schemas/logic";
import type { RuntimeEntity } from "../runtime/types";
import { compileExpression } from "./JsonLogicAdapter.compile";
import { registerOperations } from "./JsonLogicAdapter.ops";
import {
    createEntityFacade,
    createLogicDataFacade,
} from "./JsonLogicAdapter.entityFacade";
import type { EvaluationContext, LogicMode } from "./JsonLogicAdapter.types";

const EMPTY_SELF: RuntimeEntity = {};

export class JsonLogicAdapter {
    public constructor() {
        registerOperations();
    }

    public evaluate(
        rule: LogicRule,
        context: EvaluationContext,
        mode: LogicMode,
    ): number | boolean {
        if (!rule.compiled) {
            rule.compiled = compileExpression(rule.tokens);
        }

        const self = createEntityFacade(
            context.self ?? EMPTY_SELF,
            context.assignmentMap,
        );

        const baseData = {
            self,
            globals: context.globals,
            slots: context.slots ?? {},
            __snapshot: context.snapshot,
            __mode: mode,
            __slots: context.slots ?? {},
        };

        return jsonLogic.apply(
            rule.compiled as any,
            createLogicDataFacade(baseData, context),
        );
    }
}

export type { EvaluationContext, LogicMode } from "./JsonLogicAdapter.types";

