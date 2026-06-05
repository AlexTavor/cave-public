import type { Runtime } from "../../../engine/runtime/Runtime";
import type { ExecutionContext } from "../../../lib/terminal";

/**
 * ui-side adapter for the terminal's opaque runtime handle. The lib
 * `ExecutionContext` exposes `runtime.getRuntime()` as `unknown` (lib sits below
 * the engine and cannot name `Runtime`), so this narrows it to the real Runtime at
 * the ui boundary — the single place that assertion lives.
 */
export const getCommandRuntime = (
    context: Pick<ExecutionContext, "runtime">,
): Runtime | null => (context.runtime?.getRuntime?.() as Runtime | null) ?? null;
