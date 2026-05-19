import { describe, it, expect } from "vitest";
import { createBlueprint } from "../../test/factories";
import { compileStorageAutoRequest } from "./storageAutoRequestCompiler";
import type { StorageAutoRequestConfig } from "../../../data/schemas/abilities/storageAutoRequest";

const makeDraft = () =>
    createBlueprint("store", {
        components: {
            state: { food: { value: 0, max: 100, visible: true } },
        },
    });

const makeConfig = (
    overrides: Partial<StorageAutoRequestConfig> = {},
): StorageAutoRequestConfig => ({
    enabled: true,
    cadence_s: 1,
    source: "tag:storage:food",
    minRequest: 1,
    maxRequest: 50,
    ...overrides,
});

describe("storageAutoRequestCompiler", () => {
    it("does nothing when disabled", () => {
        const draft = makeDraft();
        compileStorageAutoRequest(
            draft,
            makeConfig({ enabled: false }),
            "food",
            0,
        );

        expect(draft.components.passiveEffects ?? []).toHaveLength(0);
        expect(draft.components.behavior?.rules ?? []).toHaveLength(0);
    });

    it("emits ADD dt_s passive effect for timer", () => {
        const draft = makeDraft();
        compileStorageAutoRequest(draft, makeConfig(), "food", 0);

        const effects = draft.components.passiveEffects!;
        expect(effects).toHaveLength(1);
        expect(effects[0]).toMatchObject({
            op: "ADD",
            target: "self.state.auto_req_food_timer_0.value",
            source: "global.dt_s",
        });
    });

    it("emits need computation rule with timer gate", () => {
        const draft = makeDraft();
        compileStorageAutoRequest(draft, makeConfig(), "food", 0);

        const rules = draft.components.behavior?.rules ?? [];
        const needRule = rules.find((r) => r.id === "sys_auto_req_food_need_0");
        expect(needRule).toBeDefined();
        expect(needRule!.actions[0]).toMatchObject({
            type: "MUTATE",
            op: "SET",
            value: "self.state.food.max - self.state.food.value",
        });
    });

    it("emits exact transfer rule when need <= maxRequest", () => {
        const draft = makeDraft();
        compileStorageAutoRequest(
            draft,
            makeConfig({ maxRequest: 50 }),
            "food",
            0,
        );

        const rules = draft.components.behavior?.rules ?? [];
        const xfer = rules.find((r) => r.id === "sys_auto_req_food_xfer_0");
        expect(xfer).toBeDefined();
        const needCheck = xfer!.conditions.find((c) => c.id === "need_check");
        expect(needCheck!.tokens).toContainEqual({ t: "val", v: 50 });
        expect(xfer!.actions[0]).toMatchObject({
            type: "TRANSFER",
            source: "tag:storage:food",
            target: "self",
        });
        expect(xfer!.actions[0]).not.toHaveProperty("isImmediate");
    });

    it("emits capped transfer rule when need > maxRequest", () => {
        const draft = makeDraft();
        compileStorageAutoRequest(
            draft,
            makeConfig({ maxRequest: 50 }),
            "food",
            0,
        );

        const rules = draft.components.behavior?.rules ?? [];
        const cap = rules.find((r) => r.id === "sys_auto_req_food_xfer_cap_0");
        expect(cap).toBeDefined();
        expect(cap!.actions[0]).toMatchObject({ amount: 50 });
    });

    it("respects minRequest in transfer conditions", () => {
        const draft = makeDraft();
        compileStorageAutoRequest(
            draft,
            makeConfig({ minRequest: 10 }),
            "food",
            0,
        );

        const rules = draft.components.behavior?.rules ?? [];
        const xfer = rules.find((r) => r.id === "sys_auto_req_food_xfer_0");
        const minCond = xfer!.conditions.find((c) => c.id === "need_above_min");
        expect(minCond!.tokens).toContainEqual({ t: "val", v: 10 });
    });
});
