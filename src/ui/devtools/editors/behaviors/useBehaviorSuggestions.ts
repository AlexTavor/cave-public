import { useMemo } from "react";
import type { Suggestion } from "../../../../lib/terminal/types";
import { useShellStore } from "../../shell/shell";
import { useModuleStore } from "../../state/moduleStore";
import type { EditorVerb } from "./compiler/constants";
import { OPERATORS } from "./compiler/constants";

const ROOT_VERBS: EditorVerb[] = ["WHEN"];
const VERB_SET = new Set<string>([
    "WHEN",
    "DO",
    "AND",
    "SET",
    "ADD",
    "SUB",
    "TRANSFER",
    "SPAWN",
    "KILL",
    "ADD_TRAIT",
    "REMOVE_TRAIT",
]);

const buildSuggestions = (labels: string[]): Suggestion[] =>
    labels.map((label) => ({
        label,
        type: "value",
        insertText: label,
    }));

export const useBehaviorSuggestions = (input: string): Suggestion[] => {
    const activeModuleFilename = useShellStore((s) => s.activeModuleFilename);
    const moduleData = useModuleStore((s) =>
        activeModuleFilename ? s.modules[activeModuleFilename] : null,
    );

    const blueprintIds = useMemo(
        () => Object.keys(moduleData?.blueprints ?? {}),
        [moduleData],
    );

    return useMemo(() => {
        const hasTrailingSpace = /\s$/.test(input);
        const trimmed = input.trim();
        const parts = trimmed ? trimmed.split(/\s+/) : [];
        const currentToken = hasTrailingSpace ? "" : (parts.at(-1) ?? "");
        const previousToken = hasTrailingSpace
            ? (parts.at(-1) ?? "")
            : (parts.at(-2) ?? "");

        const normalizedCurrent = currentToken.toLowerCase();

        const isFirstToken = !hasTrailingSpace && parts.length <= 1;
        if (isFirstToken) {
            const matches = ROOT_VERBS.filter((verb) =>
                verb.toLowerCase().startsWith(normalizedCurrent),
            );
            return buildSuggestions(matches);
        }

        const previousUpper = previousToken.toUpperCase();
        if (
            previousToken &&
            (VERB_SET.has(previousUpper) || OPERATORS.has(previousUpper))
        ) {
            const refs = ["self", "global", ...blueprintIds];
            const matches = refs.filter((ref) =>
                ref.toLowerCase().startsWith(normalizedCurrent),
            );
            return buildSuggestions(matches);
        }

        return [];
    }, [input, blueprintIds]);
};
