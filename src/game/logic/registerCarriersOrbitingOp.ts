import jsonLogic from "json-logic-js";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateCarriersOrbiting } from "../carriers/carriersOrbitingCondition";

export const registerCarriersOrbitingOp = (): void => {
    jsonLogic.add_operation("CARRIERS_ORBITING", function (this: unknown) {
        const ctx = this as { __snapshot?: Snapshot };
        return ctx.__snapshot
            ? evaluateCarriersOrbiting(ctx.__snapshot)
            : false;
    });
};
