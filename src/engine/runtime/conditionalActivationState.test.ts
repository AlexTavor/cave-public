import { describe, expect, it } from "vitest";
import {
    getConditionalActivationActiveStateKey,
    isConditionalActivationActive,
    isConditionalActivationThrottleHidden,
} from "./conditionalActivationState";

describe("conditionalActivationState", () => {
    it("reads active and hidden flags from visible runtime state", () => {
        const entity = {
            state: {
                conditional_activation_active: { value: 1 },
                conditional_activation_cycle_hide_throttle: { value: true },
            },
        };

        expect(isConditionalActivationActive(entity)).toBe(true);
        expect(isConditionalActivationThrottleHidden(entity)).toBe(true);
    });

    it("treats missing or falsy state as inactive", () => {
        expect(isConditionalActivationActive(undefined)).toBe(false);
        expect(
            isConditionalActivationActive({
                state: { conditional_activation_active: { value: 0 } },
            }),
        ).toBe(false);
        expect(
            isConditionalActivationActive(
                { state: { conditional_activation_active_1: { value: 1 } } },
                2,
            ),
        ).toBe(false);
    });

    it("reads suffixed active keys for later conditional activation entries", () => {
        expect(getConditionalActivationActiveStateKey(0)).toBe(
            "conditional_activation_active",
        );
        expect(getConditionalActivationActiveStateKey(2)).toBe(
            "conditional_activation_active_2",
        );
        expect(
            isConditionalActivationActive(
                { state: { conditional_activation_active_2: { value: 1 } } },
                2,
            ),
        ).toBe(true);
    });
});
