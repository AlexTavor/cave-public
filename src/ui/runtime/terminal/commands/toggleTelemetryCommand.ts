import { CommandDefinition } from "../../../../lib/terminal";
import { useRuntimeToolStore } from "../../state/useRuntimeToolStore";

export const toggleTelemetryCommand: CommandDefinition = {
    name: "telemetry",
    description: "Toggle telemetry display.",
    usage: "telemetry",
    execute: () => {
        const store = useRuntimeToolStore.getState();
        store.toggleTelemetry();
        return {
            type: "success",
            content: `Telemetry display ${store.isTelemetryOpen ? "enabled" : "disabled"}.`,
        };
    },
};
