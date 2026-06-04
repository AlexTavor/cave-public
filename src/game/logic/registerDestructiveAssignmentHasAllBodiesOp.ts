import jsonLogic from "json-logic-js";
import { evaluateDestructiveAssignmentHasAllBodies } from "../assignment/destructiveAssignmentCondition";
import type { LogicOpContext } from "./logicOpContext";

export const registerDestructiveAssignmentHasAllBodiesOp = (): void => {
    jsonLogic.add_operation(
        "DESTRUCTIVE_ASSIGNMENT_HAS_ALL_BODIES",
        function (this: LogicOpContext) {
            if (!this.__snapshot || typeof this.self?.id !== "string") {
                return false;
            }
            return evaluateDestructiveAssignmentHasAllBodies(
                this.__snapshot,
                this.self.id,
            );
        },
    );
};
