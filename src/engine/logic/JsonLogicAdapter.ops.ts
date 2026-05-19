import jsonLogic from "json-logic-js";
import type { Snapshot } from "../runtime/Snapshot";
import type { RuntimeEntity } from "../runtime/types";
import type { LogicMode } from "./JsonLogicAdapter.types";
import { AccessViolationError } from "./errors";
import { registerCarriersOrbitingOp } from "./registerCarriersOrbitingOp";
import { registerBodyInPointerOp } from "./registerBodyInPointerOp";
import { registerBodiesAssignedOp } from "./registerBodiesAssignedOp";
import { registerDestructiveAssignmentHasAllBodiesOp } from "./registerDestructiveAssignmentHasAllBodiesOp";

let opsRegistered = false;

export const registerOperations = (): void => {
    if (opsRegistered) return;
    opsRegistered = true;
    registerCarriersOrbitingOp();
    registerBodyInPointerOp();
    registerBodiesAssignedOp();
    registerDestructiveAssignmentHasAllBodiesOp();

    jsonLogic.add_operation("QUERY", function (this: any, tag: unknown) {
        const ctx = this as { __mode?: LogicMode; __snapshot?: Snapshot };

        if (ctx.__mode === "tier2_entity") {
            throw new AccessViolationError("Tier 2 logic cannot use QUERY.");
        }

        if (!ctx.__snapshot || typeof tag !== "string") {
            return [];
        }

        return ctx.__snapshot.query({ tag });
    });

    jsonLogic.add_operation("QUERY_COUNT", function (this: any, tag: unknown) {
        const ctx = this as { __mode?: LogicMode; __snapshot?: Snapshot };

        if (ctx.__mode === "tier2_entity") {
            throw new AccessViolationError(
                "Tier 2 logic cannot use QUERY_COUNT.",
            );
        }

        if (!ctx.__snapshot || typeof tag !== "string") {
            return 0;
        }

        return ctx.__snapshot.query({ tag }).length;
    });

    jsonLogic.add_operation(
        "SLOT",
        function (this: any, slotName: unknown, propPath?: unknown) {
            const ctx = this as {
                __mode?: LogicMode;
                __slots?: Record<string, RuntimeEntity[]>;
            };

            if (ctx.__mode === "tier1_world") {
                throw new AccessViolationError("Tier 1 logic cannot use SLOT.");
            }

            if (typeof slotName !== "string") return [];
            const slots = ctx.__slots ?? {};
            const entities = slots[slotName] ?? [];

            if (typeof propPath !== "string" || propPath.length === 0) {
                return entities;
            }

            const segments = propPath.split(".");
            return entities
                .map((entity) => {
                    let current: any = entity;
                    for (const segment of segments) {
                        if (current == null) return undefined;
                        current = current[segment];
                    }
                    return current;
                })
                .filter((value) => value !== undefined);
        },
    );

    jsonLogic.add_operation(
        "SUM",
        function (this: any, values: unknown, propPath?: unknown) {
            if (!Array.isArray(values)) return 0;

            if (typeof propPath !== "string" || propPath.length === 0) {
                return values.reduce(
                    (acc, value) => acc + Number(value ?? 0),
                    0,
                );
            }

            const segments = propPath.split(".");
            return values.reduce((acc, value) => {
                let current: any = value;
                for (const segment of segments) {
                    if (current == null) return acc;
                    current = current[segment];
                }
                return acc + Number(current ?? 0);
            }, 0);
        },
    );
};

