/**
 * The global-state-key naming contract for habiti bonuses. Pure leaf (no deps)
 * so it can be shared by the compiler (engine), which wires passive-effect
 * sources to these keys, and the game runtime, which reads/syncs the values.
 * Keeping a single source for the names prevents the writer and reader drifting.
 */
export const resourceGainBonusStateKey = (resource: string) =>
    `habiti_resource_gain_bonus_${resource.trim()}`;

export const producerOutputBonusStateKey = (tag: string) =>
    `habiti_producer_output_bonus_${tag.trim()}`;
