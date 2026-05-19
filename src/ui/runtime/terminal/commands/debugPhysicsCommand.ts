import { CommandDefinition } from "../../../../lib/terminal";
import { useRuntimeToolStore } from "../../state/useRuntimeToolStore";

export const debugPhysicsCommand: CommandDefinition = {
    name: "debug.physics",
    description: "Toggle the physics debug overlay (colliders & velocity)",
    usage: "debug.physics",
    execute: () => {
        const store = useRuntimeToolStore.getState();
        const nextState = !store.isPhysicsDebugVisible;
        store.togglePhysicsDebug(nextState);

        return {
            type: "success",
            content: `Physics debug overlay ${nextState ? "enabled" : "disabled"}.`,
        };
    },
    autocomplete: () => [],
};
