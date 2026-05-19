import type { Suggestion } from "../../../../lib/terminal/types";
import type { Blueprint } from "../../../../data/schemas/blueprint";
import type { ModuleCartridge } from "../../../../data/schemas/module";
import { filterByPrefix } from "../behaviors/autocomplete/behaviorStateMachine.helpers";
import { parsePath } from "../behaviors/autocomplete/schemaIntrospection.utils";
import { resolvePath } from "../behaviors/autocomplete/schemaIntrospection";

export interface CursorContext {
    tokens: string[];
    currentToken: string;
    tokenIndex: number;
}

export const getCursorContext = (
    value: string,
    cursor: number,
): CursorContext => {
    const safeCursor = Math.min(Math.max(cursor, 0), value.length);
    const tokenRegex = /\S+/g;
    let match: RegExpExecArray | null;
    const allTokens: string[] = [];
    let currentToken = "";
    let tokenIndex = -1;

    while ((match = tokenRegex.exec(value)) !== null) {
        allTokens.push(match[0]);
        const start = match.index;
        const end = start + match[0].length;
        if (safeCursor >= start && safeCursor <= end) {
            currentToken = match[0];
            tokenIndex = allTokens.length - 1;
        }
    }

    if (tokenIndex < 0) tokenIndex = allTokens.length;

    return { tokens: allTokens, currentToken, tokenIndex };
};

const isNumericLeaf = (
    moduleData: ModuleCartridge | null,
    draft: Blueprint | null,
    path: string,
): boolean => {
    const node = resolvePath(moduleData, draft, path);
    return node.type === "number" && !node.children?.length;
};

export const buildRefSuggestions = (
    inputToken: string,
    moduleData: ModuleCartridge | null,
    draft: Blueprint | null,
): Suggestion[] => {
    if (!inputToken?.includes(".")) return [];

    if (isNumericLeaf(moduleData, draft, inputToken)) return [];

    const directNode = resolvePath(moduleData, draft, inputToken);
    if (directNode.children && directNode.children.length > 0) {
        const prefix = inputToken.endsWith(".") ? inputToken : `${inputToken}.`;
        return directNode.children.map((label) => ({
            label: `${prefix}${label}`,
            type: "value" as const,
            insertText: `${prefix}${label}`,
        }));
    }

    const parsed = parsePath(inputToken);
    if (!parsed) return [];
    const { base, pathSegments, partial } = parsed;
    if (!base) return [];

    const resolvedPath = [base, ...pathSegments].join(".");
    const node = resolvePath(moduleData, draft, resolvedPath);
    const children = node.children ?? [];
    if (children.length === 0) return [];

    const prefix = `${resolvedPath}.`;
    return filterByPrefix(children, partial).map((label) => ({
        label: `${prefix}${label}`,
        type: "value" as const,
        insertText: `${prefix}${label}`,
    }));
};

export const getEntityRoots = (
    moduleData: ModuleCartridge | null,
): string[] => {
    const entityIds = Object.keys(moduleData?.blueprints ?? {});
    return ["self", "global", ...entityIds];
};
