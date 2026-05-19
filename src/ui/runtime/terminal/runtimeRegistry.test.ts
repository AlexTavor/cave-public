import { describe, it, expect, vi } from "vitest";
import { CommandDefinition } from "../../../lib/terminal";

vi.mock("../state/useRuntimeStore", () => ({
    useRuntimeStore: {
        getState: () => ({
            runtime: null,
            step: vi.fn(() => null),
            play: vi.fn(),
            pause: vi.fn(),
            loadCartridge: vi.fn(),
        }),
    },
}));

vi.mock("../state/useTelemetryStore", () => ({
    useTelemetryStore: {
        getState: () => ({
            setSticky: vi.fn(),
            log: vi.fn(),
            clear: vi.fn(),
        }),
    },
}));

vi.mock("../../devtools/state/moduleStore", () => ({
    useModuleStore: {
        getState: () => ({
            loadOrder: [],
            modules: {},
        }),
    },
}));

import { createRuntimeRegistry, RUNTIME_COMMANDS } from "./runtimeRegistry";

describe("runtimeRegistry", () => {
    it("executes registered commands", async () => {
        const registry = createRuntimeRegistry();
        const handler = vi.fn<CommandDefinition["execute"]>(() => ({
            type: "success",
            content: "ok",
        }));

        const mockCommand: CommandDefinition = {
            name: "mock",
            description: "mock",
            usage: "mock <arg>",
            execute: handler,
        };

        registry.register(mockCommand);

        const result = await registry.execute("mock arg");
        expect(handler).toHaveBeenCalled();
        expect(result.type).toBe("success");
    });

    it("returns error on invalid args", async () => {
        const registry = createRuntimeRegistry();
        const result = await registry.execute("tick.step now");
        expect(result.type).toBe("error");
    });

    it("returns error on unknown command", async () => {
        const registry = createRuntimeRegistry();
        const result = await registry.execute("unknown.cmd");
        expect(result.type).toBe("error");
        expect(result.content).toContain("Unknown command");
    });

    it("registers the tutorial_mode command", () => {
        expect(
            RUNTIME_COMMANDS.some(
                (command) => command.name === "tutorial_mode",
            ),
        ).toBe(true);
    });
});

