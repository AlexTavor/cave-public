import { describe, expect, it } from "vitest";
import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

const compiler = new CompilerService();

const makeStorage = (
    overrides: Partial<StorageAbilityConfig> = {},
): StorageAbilityConfig => ({
    resource: "food",
    initialValue: 0,
    capacity: { base: 100, perBody: 1, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 1, perBody: 0, multPerBody: 0 },
    visible: true,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
    autoRequest: {
        enabled: true,
        cadence_s: 1,
        minRequest: 1,
        maxRequest: 10,
    },
    ...overrides,
});

const compileStorage = (storage: StorageAbilityConfig[]) =>
    compiler.compile(
        createBlueprint("store", {
            components: {},
            _editor: { abilities: { storage } },
        }),
    );

describe("storageCompilerReconciler", () => {
    it("removes storage bars on the first compile after visibility is hidden", () => {
        const visible = compileStorage([makeStorage()]);
        const hidden = compiler.compile({
            ...visible,
            _editor: {
                abilities: { storage: [makeStorage({ visible: false })] },
            },
        } as any);

        expect(hidden.components.state?.food?.visible).toBe(false);
        expect(hidden.components.display?.bars ?? []).not.toContainEqual(
            expect.objectContaining({ key: "state.food" }),
        );
    });

    it("removes stale artifacts when storage resource changes", () => {
        const food = compileStorage([makeStorage()]);
        const heat = compiler.compile({
            ...food,
            _editor: {
                abilities: { storage: [makeStorage({ resource: "heat" })] },
            },
        } as any);

        expect(heat.components.state?.food).toBeUndefined();
        expect(Object.keys(heat.components.state ?? {})).not.toContain(
            "vals_storage_food_cap_0",
        );
        expect(heat.tags ?? []).not.toContain("storage:food");
        expect(heat.components.display?.bars ?? []).not.toContainEqual(
            expect.objectContaining({ key: "state.food" }),
        );
        expect(heat.components.state?.heat).toBeDefined();
    });

    it("removes stale entropy and auto-request artifacts when they are disabled", () => {
        const enabled = compileStorage([makeStorage()]);
        const disabled = compiler.compile({
            ...enabled,
            _editor: {
                abilities: {
                    storage: [
                        makeStorage({
                            entropy: { base: 0, perBody: 0, multPerBody: 0 },
                            autoRequest: undefined,
                        }),
                    ],
                },
            },
        } as any);

        expect(
            Object.keys(disabled.components.state ?? {}).some((key) =>
                key.startsWith("vals_entropy_food_"),
            ),
        ).toBe(false);
        expect(
            Object.keys(disabled.components.state ?? {}).some((key) =>
                key.startsWith("auto_req_food_"),
            ),
        ).toBe(false);
        expect(
            (disabled.components.passiveEffects ?? []).some(
                (effect) =>
                    JSON.stringify(effect).includes("entropy_food") ||
                    JSON.stringify(effect).includes("auto_req_food"),
            ),
        ).toBe(false);
        expect(
            (disabled.components.behavior?.rules ?? []).some((rule) =>
                rule.id?.startsWith("sys_auto_req_food_"),
            ),
        ).toBe(false);
    });
});
