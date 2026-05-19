// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../../lib/foundation/icon-registry/IconRegistryProvider";
import { CaveCard } from "./CaveCard";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { EntityStateLinkProvider } from "../entity-state-link";
import { TestWorldInteractionProvider } from "../testUtils";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const renderCard = (entity: RuntimeEntity, runtime: any) =>
    render(
        <TestWorldInteractionProvider value={{ runtime }}>
            <EntityStateLinkProvider>
                <ThemeProvider>
                    <IconRegistryProvider>
                        <CaveCard entity={entity} runtime={runtime} />
                    </IconRegistryProvider>
                </ThemeProvider>
            </EntityStateLinkProvider>
        </TestWorldInteractionProvider>,
    );

describe("CaveCard", () => {
    it("renders the cave overview sections", () => {
        const carrier: RuntimeEntity = {
            id: "carrier_1",
            carrier: {
                commands: [{ type: "GAIN_HABITI", habitusId: "woods" }],
            } as any,
        } as RuntimeEntity;
        const entity: RuntimeEntity = {
            id: "sys_world",
            label: "The Cave",
            state: {
                health: { value: 1, max: 1 },
                comfort: { value: 0.5, max: 1 },
                food: { value: 50, max: 100 },
                heat: { value: 50, max: 100 },
                population: { value: 4 },
            },
            cave: {
                progression: { level: 2, xp: 10 },
                ownedHabiti: ["human"],
                ownedUnderstanding: ["insight"],
                attributes: { body: 10, mind: 10, social: 10 },
            } as any,
            behavior: { rules: [] } as any,
        };
        const runtime = {
            getEntity: () => entity,
            getEntities: () => [entity, carrier],
            getCartridge: () => ({
                config: {
                    habiti: {
                        human: {
                            label: "Human",
                            description: "Shared with the Cave.",
                            summary: "Permanent bonus.",
                            effects: [],
                        },
                        woods: {
                            label: "Woods",
                            description: "Carried home.",
                            summary: "Pending bonus.",
                            effects: [],
                        },
                    },
                    understanding: {
                        insight: {
                            label: "Insight",
                            description: "Makes patterns legible.",
                            effects: [],
                        },
                    },
                },
            }),
        } as any;

        renderCard(entity, runtime);

        expect(screen.getByText("The Cave")).toBeTruthy();
        expect(screen.getByText("2")).toBeTruthy();
        expect(screen.getByText(/10\s*\/\s*250/)).toBeTruthy();
        expect(screen.getByText("50%")).toBeTruthy();
        expect(screen.getByText("Human")).toBeTruthy();
        expect(screen.getByText("Woods")).toBeTruthy();
        expect(screen.getByText("Insight")).toBeTruthy();
        expect(
            globalThis.getComputedStyle(
                screen.getByText("Human").parentElement as HTMLElement,
            ).color,
        ).toBe("rgb(255, 152, 0)");
        expect(
            globalThis.getComputedStyle(
                screen.getByText("Insight").parentElement as HTMLElement,
            ).color,
        ).toBe("rgb(255, 152, 0)");
    });
});

