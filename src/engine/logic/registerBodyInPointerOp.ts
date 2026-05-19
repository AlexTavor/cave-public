import jsonLogic from "json-logic-js";
import type { Snapshot } from "../runtime/Snapshot";
import { evaluateBodyInPointer } from "../../game/assignment/bodyInPointerCondition";

export const registerBodyInPointerOp = (): void => {
    jsonLogic.add_operation("BODY_IN_POINTER", function (this: any) {
        const ctx = this as { __snapshot?: Snapshot };
        return ctx.__snapshot ? evaluateBodyInPointer(ctx.__snapshot) : false;
    });
};
