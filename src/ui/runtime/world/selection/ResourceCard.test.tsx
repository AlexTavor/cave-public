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

describe("ResourceCard", () => {
    it("renders blueprint descriptions and authored storage labels", () => {
        const entity = {
            id: "wood_pool",
            blueprintId: "wood_pool",
            state: {
                wood: {
                    value: 12,
                    max: 20,
                    visible: true,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 1,
                },
                stone: {
                    value: 5,
                    max: 9,
                    visible: false,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 2,
                },
            },
            display: {
                label: "Wood Pool",
                bars: [
                    {
                        key: "state.wood",
                        maxKey: "state.wood.max",
                        label: "Timber",
                        color: "#1",
                    },
                    {
                        key: "state.stone",
                        maxKey: "state.stone.max",
                        label: "Stone",
                        color: "#2",
                    },
                ],
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
                            },
                        },
                    },
                },
            }),
        } as any;

        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <ResourceCard entity={entity} runtime={runtime} />
                </IconRegistryProvider>
            </ThemeProvider>,
        );

        expect(screen.getByText("Wood Pool")).toBeTruthy();
        expect(screen.getByText("Timber")).toBeTruthy();
        expect(screen.getByText("Stone")).toBeTruthy();
        expect(
            screen.getByText("Stored wood that my bodies can burn."),
        ).toBeTruthy();
    });

    it("shows the empty storage message when no visible storage exists", () => {
        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <ResourceCard
                        entity={
                            { id: "empty", display: { label: "Empty" } } as any
                        }
                        runtime={null}
                    />
                </IconRegistryProvider>
            </ThemeProvider>,
        );

        expect(screen.getByText("No visible storage.")).toBeTruthy();
    });
});
