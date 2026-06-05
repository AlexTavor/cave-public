import type { Blueprint } from "../../../data/schemas/blueprint";
import type { StorageAutoRequestConfig } from "../../../data/schemas/abilities/storageAutoRequest";
import { Op } from "../../../data/schemas/primitives";
import { ensureStateEntry } from "./upkeepCompilerUtils";
import { buildAutoReqTransferRule } from "../../../data/schemas/v2/autoRequestRuleBuilder";
import { withThrottleCondition } from "./storageAutoRequestCompiler.helpers";

export const compileStorageAutoRequest = (
    draft: Blueprint,
    autoReq: StorageAutoRequestConfig,
    resource: string,
    index: number,
): void => {
    if (!autoReq.enabled) return;

    const timerKey = `auto_req_${resource}_timer_${index}`;
    const needKey = `auto_req_${resource}_need_${index}`;
    ensureStateEntry(draft, timerKey);
    ensureStateEntry(draft, needKey);

    const components = draft.components;
    components.passiveEffects ??= [];
    components.passiveEffects.push({
        op: Op.ADD,
        target: `self.state.${timerKey}.value`,
        source: "global.dt_s",
    });

    const source = autoReq.source ?? `tag:storage:${resource}`;
    const cadence = autoReq.cadence_s;
    const minReq = autoReq.minRequest;
    const maxReq = autoReq.maxRequest;
    const needRef = `self.state.${needKey}.value`;
    const isThrottled = typeof components.powerSink === "object";

    const timerCond = {
        id: "timer_ready",
        sortKey: "0",
        tokens: [
            { t: "ref" as const, v: `self.state.${timerKey}.value` },
            { t: "op" as const, v: ">=" },
            { t: "val" as const, v: cadence },
        ],
    };

    components.behavior ??= { rules: [] };
    components.behavior.rules ??= [];
    components.behavior.rules.push(
        {
            id: `sys_auto_req_${resource}_need_${index}`,
            sortKey: "sys_050",
            conditions: [timerCond],
            actions: [
                {
                    type: "MUTATE",
                    target: needRef,
                    op: "SET",
                    value: `self.state.${resource}.max - self.state.${resource}.value`,
                },
            ],
        },
        withThrottleCondition(
            buildAutoReqTransferRule({
                id: `sys_auto_req_${resource}_xfer_${index}`,
                sortKey: "sys_051",
                timerCondition: timerCond,
                needRef,
                needOp: "<=",
                needThreshold: maxReq,
                minReq,
                source,
                resource,
                amount: needRef,
                timerKey,
            }),
            isThrottled,
        ),
        withThrottleCondition(
            buildAutoReqTransferRule({
                id: `sys_auto_req_${resource}_xfer_cap_${index}`,
                sortKey: "sys_052",
                timerCondition: timerCond,
                needRef,
                needOp: ">",
                needThreshold: maxReq,
                minReq,
                source,
                resource,
                amount: maxReq,
                timerKey,
            }),
            isThrottled,
        ),
    );
};

