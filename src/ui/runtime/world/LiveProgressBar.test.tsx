// @vitest-environment jsdom
import React from "react";
import { render, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    EntityStateLinkContext,
    useEntityBarRef,
    type EntityStateLinkContextValue,
} from "./entity-state-link";

afterEach(() => {
    cleanup();
    register.mockReset();
    unregister.mockReset();
    registerText.mockReset();
    unregisterText.mockReset();
});

const register = vi.fn();
const unregister = vi.fn();
const registerText = vi.fn();
const unregisterText = vi.fn();

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const value = React.useMemo<EntityStateLinkContextValue>(
        () => ({ register, unregister, registerText, unregisterText }),
        [],
    );

    return (
        <EntityStateLinkContext.Provider value={value}>
            {children}
        </EntityStateLinkContext.Provider>
    );
};

const TestBar = () => {
    const ref = useEntityBarRef({
        id: "e1:hp",
        entityId: "e1",
        valuePath: "state.hp.value",
        maxPath: "state.hp.max",
        maxValue: 100,
    });

    return <div data-testid="fill" ref={ref} />;
};

describe("useEntityBarRef", () => {
    it("registers and unregisters bindings with DOM refs", async () => {
        const { unmount } = render(<TestBar />, { wrapper: Wrapper });

        await waitFor(() => expect(register).toHaveBeenCalledTimes(1));

        const [id, binding, element] = register.mock.calls[0];
        expect(id).toBe("e1:hp");
        expect(binding).toEqual({
            entityId: "e1",
            valuePath: "state.hp.value",
            maxPath: "state.hp.max",
            maxValue: 100,
        });
        expect(element).toBeInstanceOf(HTMLElement);

        unmount();

        expect(unregister).toHaveBeenCalledWith("e1:hp");
    });
});

