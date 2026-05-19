import React from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import {
    createBlueprint,
    createCartridge,
} from "../../../../engine/test/factories";
import { normalizeConditionalActivationConfigs } from "../../../../data/schemas/abilities/conditionalActivation";
import { getConditionalActivationActiveStateKey } from "../../../../engine/runtime/conditionalActivationState";
import { IconRegistryProvider } from "../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";

const cycleAbility = {
    maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
    costMultPerCycle: 0,
    inputs: {},
    oneOff: false,
    conditions: [],
};

const createConditionalActivationEntries = (options: Record<string, any>) =>
    options.conditionalActivation ??
    options.blueprint?._editor?.abilities?.conditionalActivation ?? [
        {
            priority: 0,
            conditions: [],
            targets: [{ ability: "cycle" }],
            inactiveExplanation: options.explanation ?? "Needs power.",
        },
    ];

const buildConditionalActivationState = (
    entries: unknown[],
    options: Record<string, any>,
) => {
    const configs = normalizeConditionalActivationConfigs(entries as any);
    return configs.reduce<Record<string, { value: number }>>(
        (state, _config, index) => ({
            ...state,
            [getConditionalActivationActiveStateKey(index)]: {
                value:
                    options.activeStates?.[index] ??
                    (index === 0 && options.active ? 1 : 0),
            },
        }),
        {},
    );
};

export const makeConditionalActivationFixture = (
    options: Record<string, any> = {},
) => {
    const blueprintId = options.blueprintId ?? "bp_notice";
    const entityId = options.entityId ?? "entity-1";
    const overrideAbilities = options.blueprint?._editor?.abilities ?? {};
    const conditionalActivation = createConditionalActivationEntries(options);
    const blueprint = createBlueprint(blueprintId, {
        components: {
            display: { label: "Notice Entity", display_key: "notice" },
        },
        ...options.blueprint,
        _editor: {
            abilities: {
                cycle: cycleAbility,
                ...overrideAbilities,
                conditionalActivation,
            },
        },
    });
    const entity = {
        id: entityId,
        blueprintId,
        label: "Notice Entity",
        state: buildConditionalActivationState(conditionalActivation, options),
        ...options.entity,
    };
    const entities = [entity, ...(options.extraEntities ?? [])];
    const blueprints = options.extraBlueprints
        ? { [blueprintId]: blueprint, ...options.extraBlueprints }
        : { [blueprintId]: blueprint };
    const cartridge = createCartridge("test.json", {
        blueprints,
    });
    const runtime = {
        getEntity: (id: string) =>
            entities.find((entry) => entry.id === id) ?? null,
        getCartridge: () => cartridge,
        getWorld: () => ({ entities }),
        commands: { enqueue: vi.fn() },
        ...options.runtime,
    };
    return { blueprint, cartridge, entity, runtime };
};

export const renderSelectionCard = (ui: React.ReactElement) =>
    render(
        <ThemeProvider>
            <IconRegistryProvider>{ui}</IconRegistryProvider>
        </ThemeProvider>,
    );
