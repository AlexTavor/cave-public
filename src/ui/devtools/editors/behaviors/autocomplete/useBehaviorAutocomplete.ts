import { useMemo } from "react";
import type { Suggestion } from "../../../../../lib/terminal/types";
import { tokenizeSentence } from "../compiler";
import { useShellStore } from "../../../shell/shell";
import { useModuleStore } from "../../../state/moduleStore";
import { behaviorStateMachine } from "./behaviorStateMachine";
import { resolvePathSuggestions } from "./schemaIntrospection";
import { useBlueprintContext } from "../../blueprint/BlueprintContext";
import { useBlueprintSlice } from "../../../state/moduleSession/useBlueprintSlice";

interface CursorContext {
    currentToken: string;
    previousToken: string;
}

const getCursorContext = (value: string, cursor: number): CursorContext => {
    const safeCursor = Math.min(Math.max(cursor, 0), value.length);
    const tokenRegex = /\S+/g;
    let match: RegExpExecArray | null;
    let previousToken = "";

    while ((match = tokenRegex.exec(value)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (safeCursor >= start && safeCursor <= end) {
            return { currentToken: match[0], previousToken };
        }
        if (end < safeCursor) {
            previousToken = match[0];
        }
    }

    return { currentToken: "", previousToken };
};

const getPathPrefix = (token: string): string => {
    const trimmed = token.trim();
    if (!trimmed.includes(".")) return "";
    if (trimmed.endsWith(".")) return trimmed;
    const lastDot = trimmed.lastIndexOf(".");
    return trimmed.slice(0, lastDot + 1);
};

const toSuggestions = (
    seeds: {
        label: string;
        insertText?: string;
        type?: Suggestion["type"];
        replace?: Suggestion["replace"];
        cursor?: Suggestion["cursor"];
    }[],
): Suggestion[] =>
    seeds.map((seed) => ({
        label: seed.label,
        type: seed.type ?? "value",
        insertText: seed.insertText ?? seed.label,
        replace: seed.replace,
        cursor: seed.cursor,
    }));

export const useBehaviorAutocomplete = (
    input: string,
    cursor: number,
): Suggestion[] => {
    const { filename, blueprintId } = useBlueprintContext();
    const activeModuleFilename = useShellStore((s) => s.activeModuleFilename);
    const moduleData = useModuleStore((s) =>
        activeModuleFilename ? s.modules[activeModuleFilename] : null,
    );
    const draft = useBlueprintSlice(filename, blueprintId) ?? undefined;

    return useMemo(() => {
        const tokens = tokenizeSentence(input);
        const { currentToken, previousToken } = getCursorContext(input, cursor);

        const pathSuggestions = resolvePathSuggestions(
            moduleData,
            draft ?? null,
            currentToken,
        );

        if (pathSuggestions.length > 0) {
            const prefix = getPathPrefix(currentToken);
            return toSuggestions(
                pathSuggestions.map((label) => ({
                    label,
                    insertText: prefix ? `${prefix}${label}` : label,
                })),
            );
        }

        return toSuggestions(
            behaviorStateMachine({
                tokens,
                currentToken,
                previousToken,
                moduleData,
                draft: draft ?? null,
            }),
        );
    }, [cursor, draft, input, moduleData]);
};
