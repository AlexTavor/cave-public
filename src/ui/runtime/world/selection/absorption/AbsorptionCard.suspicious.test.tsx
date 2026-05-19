// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { AbsorptionCard } from "./AbsorptionCard";
import { EntityStateLinkContext } from "../../entity-state-link";

describe("AbsorptionCard suspicious activity", () => {
    it("renders the suspicious pill when assignment data provides one", () => {
        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <PortalManager>
                        <EntityStateLinkContext.Provider
                            value={{
                                register: vi.fn(),
                                unregister: vi.fn(),
                                registerText: vi.fn(),
                                unregisterText: vi.fn(),
                            }}
                        >
                            <AbsorptionCard
                                data={{
                                    variant: "assignment",
                                    label: "Pool",
                                    description: "desc",
                                    assignedIds: [],
                                    duration: 100,
                                    isSelectorOpen: false,
                                    isDepleted: false,
                                    requirements: {
                                        filterLabels: [],
                                        minimumRows: [],
                                    },
                                    storageModels: [],
                                    suspiciousActivity: {
                                        text: "Risky",
                                        color: "#ff0000",
                                        tooltipTitle: "Suspicious Activity",
                                        tooltipLines: ["Purge"],
                                    },
                                }}
                                entity={
                                    {
                                        id: "pool",
                                        assignment: { assignedIds: [] },
                                    } as any
                                }
                                runtime={{ getEntity: vi.fn() } as any}
                                onRecallBodies={vi.fn()}
                                onOpenSelector={vi.fn()}
                                onCloseSelector={vi.fn()}
                                onConfirmBodies={vi.fn()}
                                onCancelSelector={vi.fn()}
                            />
                        </EntityStateLinkContext.Provider>
                    </PortalManager>
                </IconRegistryProvider>
            </ThemeProvider>,
        );
        expect(screen.getByText("Risky")).toBeTruthy();
    });
});
