import type { BehaviorAction } from "../../../../../data/schemas/behavior";
import { parseGainHabitiAction } from "./actionCompiler.gainHabiti";
import { parseGainUnderstandingAction } from "./actionCompiler.gainUnderstanding";
import { parseDispatchAction } from "./actionCompiler.dispatch";
import { parseShowCinematicAction } from "./actionCompiler.cinematic";
import { parseKillAllBodiesExceptAction } from "./actionCompiler.killBodiesExcept";
import { parseMutateAction } from "./actionCompiler.mutate";
import { parseTransferAction } from "./actionCompiler.transfer";

export const parseActionTokens = (tokens: string[]): BehaviorAction => {
    const verb = tokens[0]?.toUpperCase();
    if (!verb) {
        throw new Error("Action is missing verb.");
    }

    switch (verb) {
        case "SET":
        case "ADD":
        case "SUB":
            return parseMutateAction(tokens);
        case "TRANSFER":
            return parseTransferAction(tokens);
        case "DISPATCH":
            return parseDispatchAction(tokens);
        case "SPAWN":
            if (!tokens[1]) {
                throw new Error("SPAWN action requires a blueprint id.");
            }
            return {
                type: "SPAWN",
                blueprintId: tokens[1],
            };
        case "SPAWN_BODY": {
            if (!tokens[1]) {
                throw new Error("SPAWN_BODY requires blueprint id.");
            }
            const toIndex = tokens.findIndex((t) => t.toUpperCase() === "TO");
            const target = toIndex > -1 ? tokens[toIndex + 1] : undefined;
            return {
                type: "SPAWN_BODY",
                blueprintId: tokens[1],
                target,
            };
        }
        case "KILL":
            if (!tokens[1]) {
                throw new Error("KILL action requires an entity id.");
            }
            return {
                type: "KILL",
                entityId: tokens[1],
            };
        case "KILL_ALL_BODIES_EXCEPT":
            return parseKillAllBodiesExceptAction(tokens);
        case "ADD_TRAIT":
            if (!tokens[1]) {
                throw new Error("ADD_TRAIT action requires a trait id.");
            }
            return {
                type: "ADD_TRAIT",
                traitId: tokens[1],
            };
        case "REMOVE_TRAIT":
            if (!tokens[1]) {
                throw new Error("REMOVE_TRAIT action requires a trait id.");
            }
            return {
                type: "REMOVE_TRAIT",
                traitId: tokens[1],
            };
        case "GAIN_HABITI":
            return parseGainHabitiAction(tokens);
        case "GAIN_UNDERSTANDING":
            return parseGainUnderstandingAction(tokens);
        case "SPAWN_CARRIER":
            throw new Error(
                "SPAWN_CARRIER sentence authoring is unsupported. Use JSON authoring for nested carrier commands.",
            );
        case "SHOW_CINEMATIC":
            return parseShowCinematicAction(tokens.join(" "));
        default:
            throw new Error(`Unknown action verb: ${verb}`);
    }
};

