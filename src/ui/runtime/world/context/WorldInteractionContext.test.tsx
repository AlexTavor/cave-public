// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import {
    WorldInteractionContext,
    useWorldInteraction,
} from "./WorldInteractionContext";

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <WorldInteractionContext.Provider
        value={{
            runtime: null,
            selectedEntityId: null,
            selectEntity: () => {},
            getCameraState: () => null,
            setCameraState: () => {},
            consumePendingCameraRestore: () => null,
            consumeRuntimeVisualEffects: () => [],
        }}
    >
        {children}
    </WorldInteractionContext.Provider>
);

describe("WorldInteractionContext", () => {
    it("throws when hook used outside provider", () => {
        expect(() => renderHook(() => useWorldInteraction())).toThrow(
            /must be used within a WorldInteractionProvider/i,
        );
    });

    it("returns context when provider is present", () => {
        const { result } = renderHook(() => useWorldInteraction(), {
            wrapper,
        });

        expect(result.current.runtime).toBeNull();
        expect(result.current.selectedEntityId).toBeNull();
    });
});

