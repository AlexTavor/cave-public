// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IconRegistryProvider } from "../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { ResourceCard } from "./ResourceCard";

vi.mock("../entity-state-link", () => ({
    useEntityBarRef: () => ({ current: null }),
    useEntityTextRef: () => ({ current: null }),
}));

describe("ResourceCard flyweight", () => {
    it("renders storage bars from blueprint-owned display data", () => {
        // Given
        const entity = {
            id: "wood_pool",
            blueprintId: "wood_pool",
            state: {
                wood: {
                    value: 12,
                    max: 20,
                    visible: false,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 1,
                },
            },
        } as any;
        const runtime = {
            getEntity: () => entity,
            getCartridge: () => ({
                blueprints: {
                    wood_pool: {
                        components: {
                            display: {
                                description:
                                    "Stored wood that my bodies can burn.",
                                bars: [
                                    {
                                        key: "state.wood",
                                        maxKey: "state.wood.max",
                                        label: "Timber",
                                        color: "#1",
                                    },
                                ],
                            },
                        },
                    },
                },
            }),
        } as any;

        // When
        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <ResourceCard entity={entity} runtime={runtime} />
                </IconRegistryProvider>
            </ThemeProvider>,
        );

        // Then
        expect(screen.getByText("Timber")).toBeTruthy();
        expect(
            screen.getByText("Stored wood that my bodies can burn."),
        ).toBeTruthy();
    });
});
