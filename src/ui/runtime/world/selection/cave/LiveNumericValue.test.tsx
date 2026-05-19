// @vitest-environment jsdom
import { act, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createRuntimeTestDouble } from "../../testUtils";
import { LiveNumericValue } from "./LiveNumericValue";

afterEach(() => {
    cleanup();
});

describe("LiveNumericValue", () => {
    it("renders formatted values from runtime after tracked mutations", async () => {
        const entity = { state: { food: { value: 42 } } } as any;
        const runtimeDouble = createRuntimeTestDouble({
            getEntity: () => entity,
        });

        render(
            <LiveNumericValue
                runtime={runtimeDouble.runtime}
                entityId="sys_world"
                path="state.food"
            />,
        );

        await waitFor(() => expect(screen.getByText("42")).toBeTruthy());

        await act(async () => {
            entity.state.food.value = 17;
            runtimeDouble.emitMutation({
                changedEntityIds: ["sys_world"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });

        await waitFor(() => expect(screen.getByText("17")).toBeTruthy());
    });
});

