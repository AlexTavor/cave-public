import { CommandDefinition } from "../../../../lib/terminal";
import { getCommandRuntime } from "../getCommandRuntime";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import { buildInvalidArgsResult, repeatSchema } from "../runtimeConstants";

export const repeatCommand: CommandDefinition = {
    name: "repeat",
    description: "Repeat a command at a fixed interval",
    usage: "repeat <count> <interval_ms> <command...>",
    execute: (args, context) => {
        const parsed = repeatSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("repeat");

        const [countRaw, intervalRaw, ...commandParts] = parsed.data;
        const repeats = Number(countRaw);
        const intervalMs = Number(intervalRaw);
        const command = commandParts.join(" ").trim();

        if (!Number.isFinite(repeats) || !Number.isInteger(repeats)) {
            return buildInvalidArgsResult("repeat");
        }

        if (repeats === 0 || repeats < -1) {
            return {
                type: "error",
                content: "Repeat count must be a positive integer or -1.",
            };
        }

        if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
            return {
                type: "error",
                content: "Interval must be a positive number.",
            };
        }

        if (!command) {
            return {
                type: "error",
                content: "Repeat command string cannot be empty.",
            };
        }

        const runtime = getCommandRuntime(context);
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        runtime.commands.enqueue({
            type: RuntimeCommandType.SPAWN_AUTOMATION,
            payload: {
                command,
                intervalMs,
                repeats,
                label: `repeat:${command}`,
            },
        });

        return {
            type: "success",
            content: `Automation queued: ${command} every ${intervalMs}ms (${repeats}).`,
        };
    },
    autocomplete: (args, context) => {
        const len = args.length;
        const token = (args[len - 1] || "").toLowerCase();

        // 1. Count Suggestions
        if (len === 1) {
            const counts = ["-1", "1", "5", "10", "100"];
            return counts
                .filter((c) => c.startsWith(token))
                .map((c) => ({
                    label: c,
                    type: "value" as const,
                    insertText: c,
                    description: c === "-1" ? "Infinite" : `Repeat ${c} times`,
                }));
        }

        // 2. Interval Suggestions
        if (len === 2) {
            const intervals = [
                { val: "1000", desc: "1 second" },
                { val: "500", desc: "0.5 seconds" },
                { val: "100", desc: "100ms" },
                { val: "16", desc: "60 FPS (approx)" },
            ];
            return intervals
                .filter((i) => i.val.startsWith(token))
                .map((i) => ({
                    label: i.val,
                    type: "value" as const,
                    insertText: i.val,
                    description: i.desc,
                }));
        }

        // 3. Inner Command Name
        if (len === 3) {
            const allCommands = context.registry.getAllCommands();
            return allCommands
                .filter((c) => c.name.toLowerCase().startsWith(token))
                .map((c) => ({
                    label: c.name,
                    type: "command" as const,
                    insertText: c.name,
                    description: c.description,
                }));
        }

        // 4. Inner Command Arguments (Recursive)
        if (len > 3) {
            const commandName = args[2];
            const innerCommand = context.registry.getCommand(commandName);

            // If the command exists and has an autocomplete handler, delegate to it
            // We slice off the first 3 args (repeat, count, interval) so the inner command
            // receives only its own arguments.
            if (innerCommand?.autocomplete) {
                const innerArgs = args.slice(3);
                return innerCommand.autocomplete(innerArgs, context);
            }
        }

        return [];
    },
};
