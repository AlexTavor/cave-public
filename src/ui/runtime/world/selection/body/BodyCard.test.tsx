// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PASSPORT_PERMANENT_TAG } from "../../../../../data/schemas/abilities/passport";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { EntityStateLinkProvider } from "../../entity-state-link";
import { BodyCard } from "./BodyCard";
import { TestWorldInteractionProvider } from "../../testUtils";

vi.mock("../../../../lib/atoms/tooltip", () => ({
    SmartTooltip: ({
        children,
        content: _content,
    }: {
        children: ReactNode;
        content: ReactNode;
    }) => <>{children}</>,
}));

vi.mock("../entityAnalysis/entityAnalysis", () => ({
    analyzeEntityState: () => ({
        modifiers: [
            {
                targetKey: "health",
                valueStr: "+1",
                intervalStr: "/s",
                sourceType: "power",
                sourceId: "regeneration",
            },
        ],
        traits: [
            {
                traitId: "cold",
                label: "Cold",
                effects: [
                    { targetKey: "body", valueStr: "-1", intervalStr: "/s" },
                ],
                description: "shivers",
            },
        ],
    }),
}));
vi.mock("../../body-avatar/useBodyAvatarPresentation", () => ({
    useBodyAvatarPresentation: () => null,
}));

const runtime = {
    getEntity: (id: string) =>
        id === "body-1"
            ? {
                  id,
                  tags: [PASSPORT_PERMANENT_TAG],
                  body: {
                      level: 2,
                      xp: 12,
                      xpRate: 1,
                      health: 7,
                      maxHealth: 10,
                      baseAttributes: { body: 2, mind: 2, social: 1 },
                      attributes: { body: 3, mind: 2, social: 1 },
                      passport: { name: "Alden Stone", portraitIcon: "worker" },
                  },
                  display: { description: "A body." },
              }
            : null,
    getCartridge: () => ({ config: { traits: {} } }),
} as any;

const renderCard = (entity: any) =>
    render(
        <TestWorldInteractionProvider value={{ runtime }}>
            <ThemeProvider>
                <IconRegistryProvider>
                    <EntityStateLinkProvider>
                        <BodyCard entity={entity} runtime={runtime} />
                    </EntityStateLinkProvider>
                </IconRegistryProvider>
            </ThemeProvider>
        </TestWorldInteractionProvider>,
    );

afterEach(() => cleanup());

describe("BodyCard", () => {
    it("renders identity, xp, and attributes", () => {
        renderCard({
            id: "body-1",
            body: { passport: { name: "Alden Stone" } },
        });
        expect(screen.getByText("Alden Stone")).toBeTruthy();
        expect(screen.getByText("Permanent")).toBeTruthy();
        expect(screen.getByText("12/250")).toBeTruthy();
        expect(screen.getByText("(+1)")).toBeTruthy();
        expect(screen.getAllByText("+1/s").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Attributes")).toBeTruthy();
        expect(screen.getByText("-1/s")).toBeTruthy();
    });

    it("does not render body details for non-body selections", () => {
        renderCard({ id: "node-1", label: "Node" });
        expect(screen.queryByText("Alden Stone")).toBeNull();
        expect(screen.queryByTestId("body-health-bar")).toBeNull();
    });
});

