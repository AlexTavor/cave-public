// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { AbsorptionCard } from "./AbsorptionCard";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import {
    EntityStateLinkContext,
    type EntityStateLinkContextValue,
} from "../../entity-state-link";
import type { AssignmentJobCardData } from "../job-card/jobCardTypes";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const linkValue: EntityStateLinkContextValue = {
    register: vi.fn(),
    unregister: vi.fn(),
    registerText: vi.fn(),
    unregisterText: vi.fn(),
};

const renderView = (
    entity: RuntimeEntity,
    data: AssignmentJobCardData,
    callbacks: {
        onRecallBodies?: (ids: string[]) => void;
        onOpenSelector?: () => void;
        onCloseSelector?: () => void;
        onConfirmBodies?: (ids: string[]) => void;
        onCancelSelector?: () => void;
    },
) =>
    render(
        <ThemeProvider>
            <IconRegistryProvider>
                <PortalManager>
                    <EntityStateLinkContext.Provider value={linkValue}>
                        <AbsorptionCard
                            data={data}
                            entity={entity}
                            runtime={{ getEntity: () => entity } as any}
                            onRecallBodies={callbacks.onRecallBodies ?? vi.fn()}
                            onOpenSelector={callbacks.onOpenSelector ?? vi.fn()}
                            onCloseSelector={
                                callbacks.onCloseSelector ?? vi.fn()
                            }
                            onConfirmBodies={
                                callbacks.onConfirmBodies ?? vi.fn()
                            }
                            onCancelSelector={
                                callbacks.onCancelSelector ?? vi.fn()
                            }
                        />
                    </EntityStateLinkContext.Provider>
                </PortalManager>
            </IconRegistryProvider>
        </ThemeProvider>,
    );

describe("AbsorptionView", () => {
    it("opens selector in idle state and renders the description once", () => {
        const entity: RuntimeEntity = {
            id: "station-1",
            assignment: { slots: 1, locking: true, assignedIds: [] },
            state: { absorption_duration: { value: 100 } },
        } as any;
        const onOpenSelector = vi.fn();
        renderView(
            entity,
            {
                variant: "assignment",
                label: "Pool",
                description: "desc",
                assignedIds: [],
                duration: 100,
                isSelectorOpen: false,
                isDepleted: false,
                requirements: { filterLabels: [], minimumRows: [] },
                storageModels: [],
            },
            { onOpenSelector },
        );
        expect(screen.getAllByText("desc")).toHaveLength(1);
        fireEvent.click(screen.getByText("Select Bodies"));
        expect(onOpenSelector).toHaveBeenCalled();
    });

    it("shows progress and calls recall in active state", () => {
        const entity: RuntimeEntity = {
            id: "station-1",
            assignment: {
                slots: 1,
                locking: true,
                assignedIds: ["proxy-1", "proxy-2"],
            },
            state: {
                absorption_progress: { value: 10 },
                absorption_duration: { value: 100 },
            },
        } as any;
        const onRecallBodies = vi.fn();
        renderView(
            entity,
            {
                variant: "assignment",
                label: "Pool",
                description: "desc",
                assignedIds: ["proxy-1", "proxy-2"],
                duration: 100,
                isSelectorOpen: false,
                isDepleted: false,
                requirements: { filterLabels: [], minimumRows: [] },
                storageModels: [],
            },
            { onRecallBodies },
        );
        fireEvent.click(screen.getByText("Abort"));
        expect(onRecallBodies).toHaveBeenCalledWith(["proxy-1", "proxy-2"]);
    });

    it("hides Select Bodies when the assignment is depleted", () => {
        const entity = {
            id: "station-1",
            assignment: { assignedIds: [] },
        } as any;
        renderView(
            entity,
            {
                variant: "assignment",
                label: "Pool",
                description: "desc",
                assignedIds: [],
                duration: 100,
                isSelectorOpen: false,
                isDepleted: true,
                requirements: { filterLabels: [], minimumRows: [] },
                storageModels: [],
            },
            {},
        );
        expect(screen.queryByText("Select Bodies")).toBeNull();
    });
});

