import type { RuntimeTelemetryAdapter } from "./RuntimeTelemetry";
import type { CommandHandlerContext } from "./handlers/types";

const NOOP_ADAPTER: RuntimeTelemetryAdapter = { log: () => {} };

export const buildTelemetryContext = (
  telemetry?: RuntimeTelemetryAdapter,
): CommandHandlerContext["telemetry"] => {
  const adapter = telemetry ?? NOOP_ADAPTER;
  return {
    log: (channel, message) => adapter.log(channel, message),
    onCommandsApplied: adapter.onCommandsApplied?.bind(adapter),
  };
};
