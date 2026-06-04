import jsonLogic from "json-logic-js";
import { evaluateBodyInPointer } from "../assignment/bodyInPointerCondition";
import type { LogicOpContext } from "./logicOpContext";

export const registerBodyInPointerOp = (): void => {
    jsonLogic.add_operation("BODY_IN_POINTER", function (this: LogicOpContext) {
        return this.__snapshot ? evaluateBodyInPointer(this.__snapshot) : false;
    });
};
