import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount React trees after every test so component effects — notably
// @floating-ui/react's `autoUpdate` (a requestAnimationFrame loop used by
// Popover/portals) — are torn down before the jsdom environment is. Without this,
// a deferred callback can fire after teardown and throw "window is not defined",
// which surfaced as a flaky CI failure (it passed locally only because a prior
// jsdom test left `window` around in the same worker).
//
// Guarded on `document` so node-environment (engine) tests, which have no DOM,
// skip it harmlessly.
afterEach(() => {
    if (typeof document !== "undefined") cleanup();
});
