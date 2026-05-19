import React from "react";
import { expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { World } from "miniplex";
import { useEntityQuery } from "./useEntityQuery";

export interface TestEntity {
    id: string;
    display?: {
        label: string;
        icon: string;
    };
}

export const Harness: React.FC<{ world: World<TestEntity> }> = ({ world }) => {
    const entities = useEntityQuery(world, "display");
    return (
        <div data-count={entities.length} data-testid="count">
            {entities.length}
        </div>
    );
};

export const expectCount = async (count: string): Promise<void> => {
    await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe(count);
    });
};
