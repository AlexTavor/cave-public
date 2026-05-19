import type { BehaviorAction } from "../../../../../data/schemas/behavior";
import { parseShowCinematicAction } from "./actionCompiler.cinematic";
import { parseActionTokens } from "./actionCompiler.parse";
import { tokenizeSentence } from "./tokenizer";

export const parseAction = (tokens: string[]): BehaviorAction =>
    parseActionTokens(tokens);

const splitActionSequence = (input: string): string[] => {
    const segments: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < input.length; index += 1) {
        const slice = input.slice(index, index + 3).toUpperCase();
        const prev = input[index - 1] ?? " ";
        const next = input[index + 3] ?? " ";
        const isAnd =
            !inQuotes && slice === "AND" && /\s/.test(prev) && /\s/.test(next);
        if (input[index] === '"') inQuotes = !inQuotes;
        if (!isAnd) {
            current += input[index];
            continue;
        }
        if (current.trim()) segments.push(current.trim());
        current = "";
        index += 2;
    }

    if (current.trim()) segments.push(current.trim());
    return segments;
};

export const compileActionSequence = (input: string): BehaviorAction[] => {
    const segments = splitActionSequence(input.trim());
    if (segments.length === 0) {
        throw new Error("Action sequence is empty.");
    }

    return segments.map((segment) => {
        if (/^SHOW_CINEMATIC\b/i.test(segment)) {
            return parseShowCinematicAction(segment);
        }
        return parseActionTokens(tokenizeSentence(segment));
    });
};

