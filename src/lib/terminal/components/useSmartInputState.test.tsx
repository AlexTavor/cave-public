// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Suggestion } from "../types";
import { useSmartInputState } from "./useSmartInputState";

const baseSuggestions: Suggestion[] = [
    { label: "apple", type: "value", insertText: "apple" },
    { label: "banana", type: "value", insertText: "banana" },
];

describe("useSmartInputState", () => {
    beforeAll(() => {
        if (!globalThis.requestAnimationFrame) {
            globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
                cb(0);
                return 0;
            };
        }
    });

    const createInputRef = (value: string, cursor: number) => {
        const input = document.createElement("input");
        input.value = value;
        input.focus();
        input.setSelectionRange(cursor, cursor);
        return { current: input } as React.RefObject<HTMLInputElement>;
    };

    it("does not show suggestions until focused", () => {
        const { result } = renderHook(() =>
            useSmartInputState({
                value: "app",
                suggestions: baseSuggestions,
                onChange: vi.fn(),
                onSubmit: vi.fn(),
            }),
        );

        expect(result.current.showSuggestions).toBe(false);
        act(() => result.current.handleFocus());
        expect(result.current.showSuggestions).toBe(true);
    });

    it("hides suggestions on blur", () => {
        const { result } = renderHook(() =>
            useSmartInputState({
                value: "app",
                suggestions: baseSuggestions,
                onChange: vi.fn(),
                onSubmit: vi.fn(),
            }),
        );

        act(() => result.current.handleFocus());
        expect(result.current.showSuggestions).toBe(true);
        act(() => result.current.handleBlur());
        expect(result.current.showSuggestions).toBe(false);
    });

    it("does not call onAbort when suggestions are empty", () => {
        const onAbort = vi.fn();
        const { result } = renderHook(() =>
            useSmartInputState({
                value: "",
                suggestions: [],
                onChange: vi.fn(),
                onSubmit: vi.fn(),
                onAbort,
            }),
        );

        act(() =>
            result.current.handleKeyDown({
                key: "Escape",
                shiftKey: false,
                defaultPrevented: false,
                preventDefault: vi.fn(),
            } as unknown as React.KeyboardEvent<HTMLInputElement>),
        );

        expect(onAbort).not.toHaveBeenCalled();
    });

    it("submits value when no suggestions on Enter", () => {
        const onSubmit = vi.fn();
        const { result } = renderHook(() =>
            useSmartInputState({
                value: "WHEN self.hp",
                suggestions: [],
                onChange: vi.fn(),
                onSubmit,
            }),
        );

        act(() =>
            result.current.handleKeyDown({
                key: "Enter",
                shiftKey: false,
                defaultPrevented: false,
                preventDefault: vi.fn(),
            } as unknown as React.KeyboardEvent<HTMLInputElement>),
        );

        expect(onSubmit).toHaveBeenCalledWith("WHEN self.hp");
    });

    it("ignores unknown key presses", () => {
        const onSubmit = vi.fn();
        const { result } = renderHook(() =>
            useSmartInputState({
                value: "",
                suggestions: baseSuggestions,
                onChange: vi.fn(),
                onSubmit,
            }),
        );

        act(() =>
            result.current.handleKeyDown({
                key: "Home",
                shiftKey: false,
                defaultPrevented: false,
                preventDefault: vi.fn(),
            } as unknown as React.KeyboardEvent<HTMLInputElement>),
        );

        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("clamps suggestion index when navigating up", () => {
        const { result } = renderHook(() =>
            useSmartInputState({
                value: "app",
                suggestions: baseSuggestions,
                onChange: vi.fn(),
                onSubmit: vi.fn(),
            }),
        );

        act(() =>
            result.current.handleKeyDown({
                key: "ArrowUp",
                shiftKey: false,
                defaultPrevented: false,
                preventDefault: vi.fn(),
            } as unknown as React.KeyboardEvent<HTMLInputElement>),
        );

        expect(result.current.suggestionIndex).toBe(1);
    });

    it("clamps suggestion index when navigating down", () => {
        const { result } = renderHook(() =>
            useSmartInputState({
                value: "app",
                suggestions: baseSuggestions,
                onChange: vi.fn(),
                onSubmit: vi.fn(),
            }),
        );

        act(() =>
            result.current.handleKeyDown({
                key: "ArrowDown",
                shiftKey: false,
                defaultPrevented: false,
                preventDefault: vi.fn(),
            } as unknown as React.KeyboardEvent<HTMLInputElement>),
        );

        expect(result.current.suggestionIndex).toBe(1);
    });

    it("applies the first suggestion on Enter", () => {
        const onChange = vi.fn();
        const onSubmit = vi.fn();
        const inputRef = createInputRef("GIVE wood", 5);

        const { result } = renderHook(() =>
            useSmartInputState({
                value: "GIVE wood",
                suggestions: baseSuggestions,
                onChange,
                onSubmit,
                inputRef,
            }),
        );

        act(() =>
            result.current.handleKeyDown({
                key: "Enter",
                shiftKey: false,
                defaultPrevented: false,
                preventDefault: vi.fn(),
            } as unknown as React.KeyboardEvent<HTMLInputElement>),
        );

        expect(onChange).toHaveBeenCalledWith("GIVE apple ");
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does not apply suggestion when event already prevented", () => {
        const onChange = vi.fn();
        const inputRef = createInputRef("GIVE wood", 5);

        const { result } = renderHook(() =>
            useSmartInputState({
                value: "GIVE wood",
                suggestions: baseSuggestions,
                onChange,
                onSubmit: vi.fn(),
                inputRef,
            }),
        );

        act(() =>
            result.current.handleKeyDown({
                key: "Enter",
                shiftKey: false,
                defaultPrevented: true,
                preventDefault: vi.fn(),
            } as unknown as React.KeyboardEvent<HTMLInputElement>),
        );

        expect(onChange).not.toHaveBeenCalled();
    });

    it("does not append space after dot suggestions", () => {
        const onChange = vi.fn();
        const inputRef = createInputRef("self", 4);

        const { result } = renderHook(() =>
            useSmartInputState({
                value: "self",
                suggestions: [
                    { label: ".", type: "operator", insertText: "self." },
                ],
                onChange,
                onSubmit: vi.fn(),
                inputRef,
            }),
        );

        act(() =>
            result.current.handleKeyDown({
                key: "Enter",
                shiftKey: false,
                defaultPrevented: false,
                preventDefault: vi.fn(),
            } as unknown as React.KeyboardEvent<HTMLInputElement>),
        );

        expect(onChange).toHaveBeenCalledWith("self.");
    });
});
