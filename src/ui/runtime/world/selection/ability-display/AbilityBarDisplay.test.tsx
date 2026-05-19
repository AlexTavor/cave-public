// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { AbilityBarDisplay } from "./AbilityBarDisplay";

const useEntityTextRefMock = vi.fn((_binding?: unknown) => ({ current: null }));

vi.mock("../../entity-state-link", () => ({
    useEntityBarRef: () => ({ current: null }),
    useEntityTextRef: (binding: unknown) => useEntityTextRefMock(binding),
}));
vi.mock("../../../../lib/atoms/tooltip", () => ({
    SmartTooltip: ({ children, content }: any) => (
        <div>
            {children}
            {content}
        </div>
    ),
}));

afterEach(() => {
    cleanup();
    useEntityTextRefMock.mockClear();
});

describe("AbilityBarDisplay", () => {
    it("renders the bar title, value, and tooltip content", () => {
        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <AbilityBarDisplay
                        model={{
                            id: "health:body-1",
                            entityId: "body-1",
                            valuePath: "body.health",
                            maxPath: "body.maxHealth",
                            current: 4,
                            max: 10,
                            color: "#4caf50",
                            iconId: "health",
                            title: "Health",
                            valueText: "4.0/10",
                            tooltipTitle: "Health",
                            tooltipLines: ["Current: 4", "Max: 10"],
                        }}
                    />
                </IconRegistryProvider>
            </ThemeProvider>,
        );

        expect(screen.getAllByText("Health")).toHaveLength(2);
        expect(screen.getByText("4.0/10")).toBeTruthy();
        expect(screen.getByText("Current: 4")).toBeTruthy();
        expect(screen.getByText("Max: 10")).toBeTruthy();
    });

    it("renders live visible values through the entity text binding", () => {
        const binding = {
            id: "health:body-1:value",
            kind: "compact-fraction",
            entityId: "body-1",
            valuePath: "body.health",
            maxPath: "body.maxHealth",
        } as const;

        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <AbilityBarDisplay
                        model={{
                            id: "health:body-1",
                            entityId: "body-1",
                            valuePath: "body.health",
                            maxPath: "body.maxHealth",
                            current: 4,
                            max: 10,
                            iconId: "health",
                            title: "Health",
                            valueBinding: binding,
                            tooltipTitle: "Health",
                            tooltipLines: ["Current: 4", "Max: 10"],
                        }}
                    />
                </IconRegistryProvider>
            </ThemeProvider>,
        );

        expect(useEntityTextRefMock).toHaveBeenCalledWith(binding);
        expect(screen.queryByText("4.0/10")).toBeNull();
    });
});
