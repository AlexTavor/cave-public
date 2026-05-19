/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDisplayTransferNodeRadiusForm } from "./useDisplayTransferNodeRadiusForm";

const rule = { minValue: 1, minRadius: 2, maxValue: 5, maxRadius: 6 };

describe("useDisplayTransferNodeRadiusForm", () => {
    it("commit emits full rule only when all four fields are valid", () => {
        const onCommit = vi.fn();
        const { result } = renderHook(() =>
            useDisplayTransferNodeRadiusForm({
                initialRule: undefined,
                onCommit,
            }),
        );
        act(() => result.current.enable());
        act(() => result.current.setField("minValue", "1"));
        act(() => result.current.setField("minRadius", "2"));
        act(() => result.current.setField("maxValue", "5"));
        act(() => result.current.setField("maxRadius", "6"));
        act(() => result.current.commit());
        expect(onCommit).toHaveBeenCalledWith(rule);
        expect(result.current.error).toBeNull();
    });

    it("commit rejects partial authoring", () => {
        const onCommit = vi.fn();
        const { result } = renderHook(() =>
            useDisplayTransferNodeRadiusForm({
                initialRule: undefined,
                onCommit,
            }),
        );
        act(() => result.current.enable());
        act(() => result.current.setField("minValue", "1"));
        act(() => result.current.commit());
        expect(onCommit).not.toHaveBeenCalled();
        expect(result.current.error).toBe(
            "All transfer radius fields are required.",
        );
    });

    it("commit rejects minValue greater than maxValue", () => {
        const onCommit = vi.fn();
        const { result } = renderHook(() =>
            useDisplayTransferNodeRadiusForm({
                initialRule: undefined,
                onCommit,
            }),
        );
        act(() => result.current.enable());
        act(() => result.current.setField("minValue", "6"));
        act(() => result.current.setField("minRadius", "2"));
        act(() => result.current.setField("maxValue", "5"));
        act(() => result.current.setField("maxRadius", "6"));
        act(() => result.current.commit());
        expect(onCommit).not.toHaveBeenCalled();
        expect(result.current.error).toBe(
            "Min value cannot be greater than max value.",
        );
    });

    it("clear removes the rule", () => {
        const onCommit = vi.fn();
        const { result } = renderHook(() =>
            useDisplayTransferNodeRadiusForm({ initialRule: rule, onCommit }),
        );
        act(() => result.current.clear());
        expect(onCommit).toHaveBeenCalledWith(undefined);
        expect(result.current.isEnabled).toBe(false);
        expect(result.current.fields.minValue).toBe("");
    });

    it("initialRule hydrates the local form state", () => {
        const { result } = renderHook(() =>
            useDisplayTransferNodeRadiusForm({
                initialRule: rule,
                onCommit: vi.fn(),
            }),
        );
        expect(result.current.isEnabled).toBe(true);
        expect(result.current.fields).toEqual({
            minValue: "1",
            minRadius: "2",
            maxValue: "5",
            maxRadius: "6",
        });
    });
});
