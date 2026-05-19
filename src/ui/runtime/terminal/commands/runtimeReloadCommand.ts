import { CommandDefinition } from "../../../../lib/terminal";
import { useModuleStore } from "../../../devtools/state/moduleStore";
import { useTelemetryStore } from "../../state/useTelemetryStore";
import { workspaceService } from "../../../../engine/terminal/commands/projectServices";
import { toModuleCartridge } from "../../../../engine/terminal/commands/projectCartridgeAdapter";
import {
    runtimeReloadSchema,
    buildInvalidArgsResult,
    RUNTIME_KEY,
    TICK_KEY,
    STATUS_KEY,
} from "../runtimeConstants";
import type { ModuleCartridge } from "../../../../data/schemas/module";

const resolveCartridge = (): {
    cartridge: ModuleCartridge;
    label: string;
} | null => {
    const moduleState = useModuleStore.getState();
    const lastLoaded = moduleState.loadOrder.at(-1);
    if (lastLoaded && moduleState.modules[lastLoaded]) {
        return {
            cartridge: moduleState.modules[lastLoaded],
            label: lastLoaded,
        };
    }
    const linked = workspaceService.activeCartridge;
    if (linked) {
        return {
            cartridge: toModuleCartridge(linked),
            label: workspaceService.getManifestPath() ?? "project",
        };
    }
    return null;
};

export const runtimeReloadCommand: CommandDefinition = {
    name: "runtime.reload",
    description: "Reload the current cartridge into the runtime.",
    usage: "runtime.reload",
    execute: (args, context) => {
        const parsed = runtimeReloadSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("runtime.reload");

        const resolved = resolveCartridge();
        if (!resolved) {
            return {
                type: "error",
                content: "No module or project loaded.",
            };
        }

        const runtime = context.runtime;
        if (!runtime?.loadCartridge) {
            return {
                type: "error",
                content: "Runtime not available.",
            };
        }

        runtime.loadCartridge(resolved.cartridge);

        const telemetry = useTelemetryStore.getState();
        telemetry.setSticky(RUNTIME_KEY, "Initialized");
        telemetry.setSticky(TICK_KEY, 0);
        telemetry.setSticky(STATUS_KEY, "paused");

        return {
            type: "success",
            content: `Runtime initialized from ${resolved.label}.`,
        };
    },
    autocomplete: () => [],
};
