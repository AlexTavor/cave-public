type StateEntry = { value?: unknown };
type EntityWithState = Record<string, unknown> | undefined;

export const CONDITIONAL_ACTIVATION_ACTIVE_STATE_KEY =
    "conditional_activation_active";
export const CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY =
    "conditional_activation_cycle_saved_throttle";
export const CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY =
    "conditional_activation_cycle_hide_throttle";

const getStateEntry = (entity: EntityWithState, key: string) =>
    (entity?.state as Record<string, StateEntry> | undefined)?.[key];

export const getConditionalActivationActiveStateKey = (index = 0): string =>
    index <= 0
        ? CONDITIONAL_ACTIVATION_ACTIVE_STATE_KEY
        : `${CONDITIONAL_ACTIVATION_ACTIVE_STATE_KEY}_${index}`;

export const isConditionalActivationActive = (
    entity: EntityWithState,
    index = 0,
): boolean => {
    const value = getStateEntry(
        entity,
        getConditionalActivationActiveStateKey(index),
    )?.value;
    return value === 1 || value === true;
};

export const isConditionalActivationThrottleHidden = (
    entity: EntityWithState,
): boolean => {
    const value = getStateEntry(
        entity,
        CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY,
    )?.value;
    return value === 1 || value === true;
};

export const hasConditionalActivationSavedThrottleState = (
    entity: EntityWithState,
): boolean =>
    !!getStateEntry(entity, CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY);
