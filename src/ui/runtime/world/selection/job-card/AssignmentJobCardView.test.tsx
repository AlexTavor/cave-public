// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { AssignmentJobCardView } from "./AssignmentJobCardView";
import type { AssignmentJobCardData } from "./jobCardTypes";

vi.mock("../absorption/BodySelector", () => ({
    BodySelector: () => <div>Selector Open</div>,
}));

afterEach(cleanup);

const data: AssignmentJobCardData = {
    variant: "assignment" as const,
    label: "Pool",
    description: "desc",
    assignedIds: [],
    duration: 100,
    isSelectorOpen: false,
    canAssignMoreBodies: true,
    isDepleted: false,
    isInactive: false,
    requirements: { filterLabels: [], minimumRows: [] },
    storageModels: [],
};

const renderView = (overrides: Partial<AssignmentJobCardData> = {}) =>
    render(
        <ThemeProvider>
            <IconRegistryProvider>
                <PortalManager>
                    <AssignmentJobCardView
                        data={{ ...data, ...overrides }}
                        entity={{ id: "pool" } as any}
                        runtime={
                            {
                                commands: { enqueue: vi.fn() },
                                getEntity: vi.fn(),
                            } as any
                        }
                    />
                </PortalManager>
            </IconRegistryProvider>
        </ThemeProvider>,
    );

describe("AssignmentJobCardView", () => {
    it("shows Select Bodies when more capacity remains", () => {
        renderView();
        expect(
            screen.getByRole("button", { name: "Select Bodies" }),
        ).toBeTruthy();
    });

    it("shows Abort when bodies are already assigned", () => {
        renderView({ assignedIds: ["body-1"], canAssignMoreBodies: false });
        expect(screen.getByRole("button", { name: "Abort" })).toBeTruthy();
    });

    it("allows Select Bodies and Abort to coexist", () => {
        renderView({ assignedIds: ["body-1"] });
        expect(
            screen.getByRole("button", { name: "Select Bodies" }),
        ).toBeTruthy();
        expect(screen.getByRole("button", { name: "Abort" })).toBeTruthy();
    });

    it("hides Select Bodies when the node is inactive or depleted", () => {
        const { rerender } = renderView({ isInactive: true });
        expect(
            screen.queryByRole("button", { name: "Select Bodies" }),
        ).toBeNull();
        rerender(
            <ThemeProvider>
                <IconRegistryProvider>
                    <PortalManager>
                        <AssignmentJobCardView
                            data={{ ...data, isDepleted: true }}
                            entity={{ id: "pool" } as any}
                            runtime={
                                {
                                    commands: { enqueue: vi.fn() },
                                    getEntity: vi.fn(),
                                } as any
                            }
                        />
                    </PortalManager>
                </IconRegistryProvider>
            </ThemeProvider>,
        );
        expect(
            screen.queryByRole("button", { name: "Select Bodies" }),
        ).toBeNull();
    });

    it("mounts the selector when the selector state is open", () => {
        renderView({ isSelectorOpen: true });
        expect(screen.getByText("Selector Open")).toBeTruthy();
    });
});
