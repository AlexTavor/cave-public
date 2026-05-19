// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useActionAutocomplete } from "./useActionAutocomplete";

describe("useActionAutocomplete", () => {
    it("includes SHOW_CINEMATIC in suggestions", () => {
        const { result } = renderHook(() => useActionAutocomplete("SHOW", 4));

        expect(result.current.map((item) => item.label)).toContain(
            "SHOW_CINEMATIC",
        );
    });
});
