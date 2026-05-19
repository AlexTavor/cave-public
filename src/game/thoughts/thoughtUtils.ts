import { DEFAULT_THOUGHT_COMPONENT } from "../../data/schemas/components/thought";
import type { RuntimeEntity } from "../../engine/runtime/types";
import type { ThoughtComponent } from "../../engine/runtime/components/ThoughtComponent";

export const getThoughtComponent = (
    world: RuntimeEntity,
): ThoughtComponent | null =>
    (world.thought as ThoughtComponent | undefined) ?? null;

export const setThoughtComponent = (
    world: RuntimeEntity,
    thought: ThoughtComponent,
) => {
    world.thought = thought;
};

export const clearThoughtComponent = (world: RuntimeEntity) => {
    setThoughtComponent(world, { ...DEFAULT_THOUGHT_COMPONENT });
};
