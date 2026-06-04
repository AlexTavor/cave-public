import { describe, expect, it } from "vitest";
import type { ExecutionContext } from "../../../../lib/terminal";
import { useRuntimeToolStore } from "../../state/useRuntimeToolStore";
import { toggleTelemetryCommand } from "./toggleTelemetryCommand";

// This command moved out of the engine STANDARD_COMMANDS bundle (which smoke-
// tests every entry) into the UI runtime registry, so it needs its own coverage.
describe("toggleTelemetryCommand", () => {
    const run = () =>
        toggleTelemetryCommand.execute([], {} as ExecutionContext);

    it("flips the telemetry display flag and reports success", async () => {
        const before = useRuntimeToolStore.getState().isTelemetryOpen;

        const result = await run();

        expect(result.type).toBe("success");
        expect(useRuntimeToolStore.getState().isTelemetryOpen).toBe(!before);

        // A second invocation restores the original state.
        await run();
        expect(useRuntimeToolStore.getState().isTelemetryOpen).toBe(before);
    });
});
