import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

const makeBlueprint = (
    id: string,
    overrides: {
        resource?: string;
        isDefault?: boolean;
        displayName?: string;
        allowDeposit?: boolean;
        allowWithdraw?: boolean;
        priority?: number;
        visible?: boolean;
        entropy?: { base: number; perBody: number; multPerBody: number };
        capacity?: { base: number; perBody: number; multPerBody: number };
    } = {},
) =>
    createBlueprint(id, {
        _editor: {
            abilities: {
                storage: [
                    {
                        resource: overrides.resource ?? "food",
                        capacity: overrides.capacity ?? {
                            base: 100,
                            perBody: 0,
                            multPerBody: 0,
                        },
                        isDefault: overrides.isDefault ?? true,
                        entropy: overrides.entropy ?? {
                            base: 0,
                            perBody: 0,
                            multPerBody: 0,
                        },
                        displayName: overrides.displayName,
                        visible: overrides.visible ?? true,
                        allowDeposit: overrides.allowDeposit ?? true,
                        allowWithdraw: overrides.allowWithdraw ?? true,
                        priority: overrides.priority ?? 0,
                    },
                ],
            },
        },
    });

const compile = (id: string, overrides = {}) =>
    new CompilerService().compile(makeBlueprint(id, overrides));

describe("storageCompiler", () => {
    it("stores allowDeposit on state entries", () => {
        const compiled = compile("bp_store", {
            resource: "wood",
            allowDeposit: false,
        });
        expect((compiled.components.state as any)?.wood?.allowDeposit).toBe(
            false,
        );
    });

    it("stores allowWithdraw and priority on state entries", () => {
        const compiled = compile("bp_vault", {
            resource: "gold",
            allowWithdraw: false,
            priority: 10,
        });
        const gold = (compiled.components.state as any)?.gold;
        expect(gold?.allowWithdraw).toBe(false);
        expect(gold?.priority).toBe(10);
    });

    it("adds storage tag when allowWithdraw is true", () => {
        const compiled = compile("bp_withdraw", {
            isDefault: false,
            allowWithdraw: true,
        });
        expect(compiled.tags).toContain("storage:food");
    });

    it("does not add storage tag when allowWithdraw is false", () => {
        const compiled = compile("bp_deposit_only", { allowWithdraw: false });
        expect(compiled.tags ?? []).not.toContain("storage:food");
    });

    it("entropy passive effect uses global.dt_s not global.dt", () => {
        const compiled = compile("bp_heat", {
            resource: "heat",
            capacity: { base: 120, perBody: 0, multPerBody: 0 },
            entropy: { base: 0.2, perBody: 0, multPerBody: 0 },
            allowDeposit: false,
        });
        const effects = compiled.components.passiveEffects ?? [];
        const setEffect = effects.find(
            (e: any) => e.op === "SET" && e.target?.includes("entropy_tick"),
        );
        expect(setEffect?.source).toBe("global.dt_s");
        expect(setEffect?.source).not.toBe("global.dt");
    });

    it("uses authored displayName for storage bars", () => {
        const compiled = compile("bp_named", {
            resource: "food",
            displayName: "Stored Food",
        });

        expect(compiled.components.display?.bars?.[0]?.label).toBe(
            "Stored Food",
        );
    });

    it("stores authored visibility on state entries", () => {
        const compiled = compile("bp_hidden", {
            resource: "heat",
            visible: false,
        });

        expect((compiled.components.state as any)?.heat?.visible).toBe(false);
        expect(compiled.components.display?.bars ?? []).toHaveLength(0);
    });

    it("compiles auto-request even when the blueprint has no display", () => {
        const compiled = new CompilerService().compile(
            createBlueprint("bp_auto", {
                components: {},
                _editor: {
                    abilities: {
                        storage: [
                            {
                                resource: "coin",
                                capacity: {
                                    base: 100,
                                    perBody: 0,
                                    multPerBody: 0,
                                },
                                isDefault: true,
                                entropy: {
                                    base: 0,
                                    perBody: 0,
                                    multPerBody: 0,
                                },
                                visible: true,
                                allowDeposit: true,
                                allowWithdraw: true,
                                priority: 20,
                                autoRequest: {
                                    enabled: true,
                                    cadence_s: 1,
                                    minRequest: 1,
                                    maxRequest: 100,
                                },
                            },
                        ],
                    },
                },
            }),
        );

        expect(
            (compiled.components.state as any).auto_req_coin_timer_0,
        ).toBeTruthy();
        expect(
            (compiled.components.behavior?.rules ?? []).some(
                (rule) => rule.id === "sys_auto_req_coin_xfer_0",
            ),
        ).toBe(true);
    });
});

