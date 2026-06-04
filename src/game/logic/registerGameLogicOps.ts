import { registerCarriersOrbitingOp } from "./registerCarriersOrbitingOp";
import { registerBodyInPointerOp } from "./registerBodyInPointerOp";
import { registerBodiesAssignedOp } from "./registerBodiesAssignedOp";
import { registerDestructiveAssignmentHasAllBodiesOp } from "./registerDestructiveAssignmentHasAllBodiesOp";

let registered = false;

/**
 * Registers the game-specific JsonLogic operations (CARRIERS_ORBITING,
 * BODY_IN_POINTER, BODIES_ASSIGNED, DESTRUCTIVE_ASSIGNMENT_HAS_ALL_BODIES) onto
 * the shared json-logic-js instance.
 *
 * These ops evaluate game-domain conditions, so the engine must not own them —
 * the game registers them when it wires itself into a runtime (see
 * registerGameCommandHandlers). Idempotent: the op table is a global singleton,
 * so repeated calls (one per runtime) are no-ops after the first.
 */
export const registerGameLogicOps = (): void => {
    if (registered) return;
    registered = true;
    registerCarriersOrbitingOp();
    registerBodyInPointerOp();
    registerBodiesAssignedOp();
    registerDestructiveAssignmentHasAllBodiesOp();
};
