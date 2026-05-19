// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { EntityStateLinkContext } from "../../entity-state-link";
import { AbsorptionCard } from "./AbsorptionCard";

describe("AbsorptionCard progress contract", () => {
    it("renders the active card without any shared progress chrome", () => {
        const view = render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <PortalManager>
                        <EntityStateLinkContext.Provider
                            value={{
                                register: () => {},
                                unregister: () => {},
                                registerText: () => {},
                                unregisterText: () => {},
                            }}
                        >
                            <AbsorptionCard
                                data={{
                                    variant: "assignment",
                                    label: "Pool",
                                    description: "desc",
                                    assignedIds: ["body-1"],
                                    duration: 10,
                                    isSelectorOpen: false,
                                    isDepleted: false,
                                    requirements: {
                                        filterLabels: [],
                                        minimumRows: [],
                                    },
                                    storageModels: [],
                                }}
                                entity={
                                    {
                                        id: "pool",
                                        assignment: { assignedIds: ["body-1"] },
                                    } as any
                                }
                                runtime={{ getEntity: () => null } as any}
                                onRecallBodies={() => {}}
                                onOpenSelector={() => {}}
                                onCloseSelector={() => {}}
                                onConfirmBodies={() => {}}
                                onCancelSelector={() => {}}
                            />
                        </EntityStateLinkContext.Provider>
                    </PortalManager>
                </IconRegistryProvider>
            </ThemeProvider>,
        );
        expect(view.container.textContent).toContain("Abort");
        expect(view.container.textContent).not.toContain("absorption");
    });
});
