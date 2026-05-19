import { nanoid } from "nanoid";

export const createStorageAbilityDraft = () => ({
    resource: "",
    displayName: "",
    initialValue: 0,
    capacity: { base: 0, perBody: 0, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 0, perBody: 0, multPerBody: 0 },
    visible: true,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
});

export const createCycleAbilityDraft = () => ({
    maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
    costMultPerCycle: 0,
    inputs: {},
    oneOff: false,
    showThrottleSlider: true,
    startActive: false,
    conditions: [],
});

export const createProductionAbilityDraft = () => ({
    id: nanoid(),
    resource: "",
    amount: { base: 0, perBody: 0, multPerBody: 0 },
    conditions: [],
});

export const createInjectionAbilityDraft = () => [];

export const createConversionAbilityDraft = () => ({
    id: nanoid(),
    inputs: [],
    outputs: [],
    resetCycle: true,
    conditions: [],
});

export const createUpkeepAbilityDraft = () => ({
    resource: "",
    displayName: "",
    rate: { base: 0, perBody: 0, multPerBody: 0 },
    failureTrait: "is_starving",
    autoRequest: true,
    isImmediate: false,
});

export const createSpawnerAbilityDraft = () => ({
    id: nanoid(),
    blueprintId: "",
    count: { base: 1, perBody: 0, multPerBody: 0 },
    mode: "spawn_body" as const,
    target: "sys_world",
    conditions: [],
});

export const createSamplerAbilityDraft = () => ({
    id: nanoid(),
    source: "",
    target: "sampled_value",
    visible: true,
    max: 100,
});

export const createDraftAbilityDraft = () => ({
    id: nanoid(),
    poolId: "",
    count: 3,
    label: "",
    conditions: [],
    onComplete: [],
});

export const createTriggeredActionsAbilityDraft = () => ({
    id: nanoid(),
    triggers: ["cycle_complete" as const],
    conditions: [],
    actions: [],
});

export const createUpdaterAbilityDraft = () => ({
    id: nanoid(),
    target: "",
    op: "ADD" as const,
    value: 1,
    conditions: [],
});

export const createConditionalActivationAbilityDraft = () => ({
    priority: 0,
    conditions: [],
    targets: [],
});

export const createNotificationAbilityDraft = () => ({
    id: nanoid(),
    title: "",
    text: "",
    imageUrl: null,
});

export const createUnifiedBlueprintMembershipDraft = () => ({
    tag: "",
    spawnWhenPeerSpawns: false,
});

