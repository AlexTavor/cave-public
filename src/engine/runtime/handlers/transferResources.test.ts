import { describe, it, expect } from "vitest";
import {
    validateWithdrawPermissions,
    validateTransferPermissions,
} from "./transferResources";
import type { RuntimeEntity } from "../types";

describe("validateWithdrawPermissions", () => {
    it("allows withdrawal when allowWithdraw is true", () => {
        const entity: RuntimeEntity = {
            id: "store",
            state: { food: { value: 50, allowWithdraw: true } },
        };

        expect(validateWithdrawPermissions(entity, "food", true)).toBe(true);
    });

    it("denies withdrawal when allowWithdraw is false", () => {
        const entity: RuntimeEntity = {
            id: "vault",
            state: { food: { value: 100, allowWithdraw: false } },
        };

        expect(validateWithdrawPermissions(entity, "food", true)).toBe(false);
    });

    it("defaults to true when allowWithdraw is not set", () => {
        const entity: RuntimeEntity = {
            id: "pile",
            state: { food: { value: 30 } },
        };

        expect(validateWithdrawPermissions(entity, "food", true)).toBe(true);
    });

    it("always allows internal withdrawal", () => {
        const entity: RuntimeEntity = {
            id: "vault",
            state: { food: { value: 100, allowWithdraw: false } },
        };

        expect(validateWithdrawPermissions(entity, "food", false)).toBe(true);
    });
});

describe("validateTransferPermissions", () => {
    it("denies deposit when allowDeposit is false", () => {
        const entity: RuntimeEntity = {
            id: "sealed",
            state: { food: { value: 0, allowDeposit: false } },
        };

        expect(validateTransferPermissions(entity, "food", true)).toBe(false);
    });
});
