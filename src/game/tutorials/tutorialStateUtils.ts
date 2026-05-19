import {
    DEFAULT_TUTORIAL_COMPONENT,
    type TutorialComponent,
} from "../../data/schemas/components/tutorial";
import type { RuntimeEntity } from "../../engine/runtime/types";

export const getTutorialComponent = (
    world: RuntimeEntity | null | undefined,
): TutorialComponent => ({
    ...DEFAULT_TUTORIAL_COMPONENT,
    ...(world?.tutorial as TutorialComponent | undefined),
    attention: {
        ...DEFAULT_TUTORIAL_COMPONENT.attention,
        ...(world?.tutorial as TutorialComponent | undefined)?.attention,
    },
    bindings:
        (world?.tutorial as TutorialComponent | undefined)?.bindings?.slice() ??
        [],
    acknowledgedModalBindingId:
        (world?.tutorial as TutorialComponent | undefined)
            ?.acknowledgedModalBindingId ?? null,
});

export const setTutorialComponent = (
    world: RuntimeEntity,
    tutorial: TutorialComponent | null,
) => {
    if (tutorial == null) delete world.tutorial;
    else world.tutorial = tutorial;
};
