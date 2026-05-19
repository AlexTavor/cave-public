import jsonLogic from "json-logic-js";
import type { Snapshot } from "../runtime/Snapshot";
import { evaluateCarriersOrbiting } from "../../game/carriers/carriersOrbitingCondition";

export const registerCarriersOrbitingOp = (): void => {
    jsonLogic.add_operation("CARRIERS_ORBITING", function (this: any) {
        const ctx = this as { __snapshot?: Snapshot };
        return ctx.__snapshot
            ? evaluateCarriersOrbiting(ctx.__snapshot)
            : false;
    });
};
