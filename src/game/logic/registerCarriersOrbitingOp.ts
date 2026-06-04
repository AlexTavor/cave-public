import jsonLogic from "json-logic-js";
import { evaluateCarriersOrbiting } from "../carriers/carriersOrbitingCondition";
import type { LogicOpContext } from "./logicOpContext";

export const registerCarriersOrbitingOp = (): void => {
    jsonLogic.add_operation(
        "CARRIERS_ORBITING",
        function (this: LogicOpContext) {
            return this.__snapshot
                ? evaluateCarriersOrbiting(this.__snapshot)
                : false;
        },
    );
};
