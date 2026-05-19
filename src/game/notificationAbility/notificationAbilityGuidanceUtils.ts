import {
    DEFAULT_NOTIFICATION_ABILITY_GUIDANCE_COMPONENT,
    type NotificationAbilityGuidanceComponent,
    type NotificationAbilityGuidanceItem,
} from "../../data/schemas/components/notificationAbilityGuidance";
import type { RuntimeEntity } from "../../engine/runtime/types";

export const getNotificationAbilityGuidanceComponent = (
    world: RuntimeEntity | null | undefined,
): NotificationAbilityGuidanceComponent => ({
    ...DEFAULT_NOTIFICATION_ABILITY_GUIDANCE_COMPONENT,
    ...(world?.notificationAbilityGuidance as
        | NotificationAbilityGuidanceComponent
        | undefined),
    attention: {
        ...DEFAULT_NOTIFICATION_ABILITY_GUIDANCE_COMPONENT.attention,
        ...(
            world?.notificationAbilityGuidance as
                | NotificationAbilityGuidanceComponent
                | undefined
        )?.attention,
    },
    queue:
        (
            world?.notificationAbilityGuidance as
                | NotificationAbilityGuidanceComponent
                | undefined
        )?.queue?.slice() ?? [],
});

export const enqueueNotificationAbilityGuidance = (
    world: RuntimeEntity,
    item: NotificationAbilityGuidanceItem,
): void => {
    const state = getNotificationAbilityGuidanceComponent(world);
    world.notificationAbilityGuidance =
        state.active && state.current
            ? { ...state, queue: [...state.queue, item] }
            : { ...state, active: true, current: item, queue: [] };
};

export const acknowledgeNotificationAbilityGuidance = (
    world: RuntimeEntity,
): void => {
    const state = getNotificationAbilityGuidanceComponent(world);
    const [next, ...rest] = state.queue;
    world.notificationAbilityGuidance = next
        ? { ...state, active: true, current: next, queue: rest }
        : {
              ...state,
              active: false,
              current: null,
              queue: [],
          };
};

export const clearNotificationAbilityGuidance = (
    world: RuntimeEntity,
): void => {
    world.notificationAbilityGuidance = {
        ...DEFAULT_NOTIFICATION_ABILITY_GUIDANCE_COMPONENT,
        attention: {
            ...DEFAULT_NOTIFICATION_ABILITY_GUIDANCE_COMPONENT.attention,
        },
        queue: [],
    };
};
