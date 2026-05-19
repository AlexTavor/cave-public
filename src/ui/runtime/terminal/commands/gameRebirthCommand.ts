import {
    extractPassportPermanentCarryover,
    restorePassportPermanentCarryover,
} from "../../../../engine/runtime/persistence/passportPermanentCarryover";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import { CommandDefinition } from "../../../../lib/terminal";
import { buildInvalidArgsResult, gameRebirthSchema } from "../runtimeConstants";
import {
    enqueueRebirthCarriers,
    enqueueRebirthPermanentFacts,
    extractRebirthCarriers,
    extractRebirthCave,
    extractRebirthPermanent,
    formatRebirthSuccess,
    WORLD_ID,
} from "./gameRebirthSupport";
import {
    enqueueRunNumberBootstrap,
    resolvePreviousRunNumber,
} from "../../../../game/facts/runNumberFact";

const DEFAULT_SCRIPT = "example/scripts/start.cvs";

export const gameRebirthCommand: CommandDefinition = {
    name: "game.rebirth",
    description: "Extracts cave data, runs the script, applied cave data",
    usage: "game.rebirth [scriptPath]",
    execute: async (args, context) => {
        const parsed = gameRebirthSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("game.rebirth");

        const scriptPath = parsed.data[0] ?? DEFAULT_SCRIPT;
        const runtime = context.runtime?.getRuntime?.();
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        const savedCave = extractRebirthCave(runtime);
        const savedCarriers = extractRebirthCarriers(runtime);
        const savedPermanent = extractRebirthPermanent(runtime);
        const previousRunNumber = resolvePreviousRunNumber(
            savedPermanent.run_number?.world,
        );
        const passportCarryover = extractPassportPermanentCarryover(runtime);
        if (!savedCave) {
            return {
                type: "error",
                content: "Rebirth failed: no cave data on sys_world.",
            };
        }

        const result = await context.registry.execute(
            `run ${scriptPath}`,
            context,
        );

        if (result.type === "error") return result;

        const newRuntime = context.runtime?.getRuntime?.();
        if (!newRuntime) {
            return {
                type: "error",
                content: "Rebirth failed: New runtime not found.",
            };
        }

        const restoreIssues = restorePassportPermanentCarryover(
            newRuntime,
            passportCarryover,
        );

        newRuntime.commands.enqueue({
            type: RuntimeCommandType.UPDATE_CAVE,
            payload: {
                entityId: WORLD_ID,
                xp: savedCave.progression?.xp,
                level: savedCave.progression?.level,
                attributes: savedCave.attributes,
                skillpoints: savedCave.progression?.skillpoints,
                ownedHabiti: savedCave.ownedHabiti,
                ownedUnderstanding: savedCave.ownedUnderstanding,
            },
        });
        enqueueRebirthCarriers(newRuntime, savedCarriers);
        enqueueRebirthPermanentFacts(newRuntime, savedPermanent);
        enqueueRunNumberBootstrap(newRuntime.commands, previousRunNumber);
        newRuntime.commands.enqueue({
            type: RuntimeCommandType.CLEAR_THOUGHT,
            payload: { reason: "rebirth" },
        });
        newRuntime.flushCommands?.();

        return {
            type: "success",
            content: formatRebirthSuccess(
                passportCarryover.issues.length + restoreIssues.length,
            ),
        };
    },
};

