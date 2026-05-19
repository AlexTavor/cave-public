import React from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { createRuntimeTestDouble } from "../../../world/testUtils";
import { BodySelector } from "./BodySelector";

const bodySelectorGlobals = globalThis as any;
bodySelectorGlobals.__bodySelectorVirtuosoDataRefs ??= [];

export const virtuosoDataRefs =
    bodySelectorGlobals.__bodySelectorVirtuosoDataRefs as unknown[];

type TestCartridge = { blueprints?: Record<string, unknown> };

vi.mock("react-virtuoso", () => ({
    Virtuoso: ({ data, itemContent }: any) =>
        React.createElement(
            "div",
            {
                "data-testid": "virtuoso",
                ref: () => virtuosoDataRefs.push(data),
            },
            data.map((item: string, index: number) =>
                React.createElement(
                    "div",
                    { key: item },
                    itemContent(index, item),
                ),
            ),
        ),
}));

vi.mock("./BodyBrick", () => ({
    BodyBrick: ({ entityId }: { entityId: string }) =>
        React.createElement(
            "div",
            {
                "data-testid": `body-brick-${entityId}`,
                "data-entity-id": entityId,
            },
            entityId,
        ),
}));

const habitusIndex = {
    known: {
        id: "known",
        label: "Ancestral Human",
        description: "Regular human.",
        summary: "Deepens my memory.",
        type: "species",
        effects: [{ type: "add_absorption_xp_conversion", amount: 0.05 }],
        excludes: [],
    },
};

export const station = {
    id: "station",
    state: {
        processing_absorbs_habiti: { value: true },
        processing_outputs: {
            value: [{ resource: "xp", source: "lifetime_xp", factor: 1 }],
        },
    },
} as any;

export const makeBody = (
    id: string,
    level: number,
    attrs: { body: number; mind: number; social: number },
    health: number,
    maxHealth: number,
    habiti: string[] = [],
): RuntimeEntity => ({
    id,
    body: { level, baseAttributes: attrs, health, maxHealth, habiti },
    display: { icon: "unknown", label: id },
});

export const renderSelector = (
    entities: RuntimeEntity[],
    stationEntity: RuntimeEntity,
    cartridge: TestCartridge = {},
) => {
    const onConfirm = vi.fn();
    const runtime = createRuntimeTestDouble({
        getEntities: () => entities,
        getEntity: (id: string) =>
            entities.find((entity) => entity.id === id) ??
            (id === stationEntity.id ? stationEntity : null),
        getCartridge: () => ({
            config: { habiti: habitusIndex },
            blueprints: cartridge.blueprints ?? {},
        }),
    }).runtime;
    render(
        <ThemeProvider>
            <IconRegistryProvider>
                <BodySelector
                    runtime={runtime as any}
                    stationEntity={stationEntity}
                    onConfirm={onConfirm}
                    onCancel={vi.fn()}
                />
            </IconRegistryProvider>
        </ThemeProvider>,
    );
    return { onConfirm };
};
