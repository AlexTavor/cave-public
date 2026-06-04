import jsonLogic from "json-logic-js";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateBodyInPointer } from "../assignment/bodyInPointerCondition";

export const registerBodyInPointerOp = (): void => {
    jsonLogic.add_operation("BODY_IN_POINTER", function (this: unknown) {
        const ctx = this as { __snapshot?: Snapshot };
        return ctx.__snapshot ? evaluateBodyInPointer(ctx.__snapshot) : false;
    });
};
