import React from "react";
import { getDefaultRichTextProcessors } from "./richTextProcessors";
import type { RichTextNode, RichTextProcessor } from "./types";

const escapeTag = (value: string) =>
    value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const buildTagPattern = (tags: string[]) =>
    new RegExp(
        String.raw`\[(/)?(${tags.map(escapeTag).join("|")})(?:=([^\]]+))?\]`,
        "g",
    );

const parseNodes = (
    source: string,
    pattern: RegExp,
    cursor = 0,
    stopTag?: string,
) => {
    const nodes: RichTextNode[] = [];
    while (cursor < source.length) {
        pattern.lastIndex = cursor;
        const match = pattern.exec(source);
        if (!match)
            return {
                nodes: [...nodes, source.slice(cursor)],
                cursor: source.length,
            };
        if (match.index > cursor) nodes.push(source.slice(cursor, match.index));
        const [token, closing, tagName, attr = ""] = match;
        cursor = pattern.lastIndex;
        const tag = tagName;
        if (closing) {
            if (tag === stopTag) return { nodes, cursor };
            nodes.push(token);
            continue;
        }
        if (tag === "icon") {
            nodes.push({ tag, attr, children: [] });
            continue;
        }
        const parsed = parseNodes(source, pattern, cursor, tag);
        nodes.push({ tag, attr, children: parsed.nodes });
        cursor = parsed.cursor;
    }
    return { nodes, cursor };
};

const getTextContent = (nodes: RichTextNode[]): string =>
    nodes
        .map((node) =>
            typeof node === "string" ? node : getTextContent(node.children),
        )
        .join("");

const renderNodes = (
    nodes: RichTextNode[],
    processors: Record<string, RichTextProcessor>,
    parentKey = "rich",
): React.ReactNode[] =>
    nodes.map((node, index) =>
        renderNode(node, `${parentKey}-${index}`, processors),
    );

const renderNode = (
    node: RichTextNode,
    key: string,
    processors: Record<string, RichTextProcessor>,
): React.ReactNode => {
    if (typeof node === "string") return node;
    const processor = processors[node.tag];
    if (!processor) return renderNodes(node.children, processors, key);
    return processor(node, {
        key,
        getTextContent,
        renderChildren: (children, parentKey = key) =>
            renderNodes(children, processors, parentKey),
    });
};

export const renderRichTextNodes = (
    source: string,
    processors?: Record<string, RichTextProcessor>,
) => {
    const mergedProcessors = {
        ...getDefaultRichTextProcessors(),
        ...processors,
    };
    const pattern = buildTagPattern(Object.keys(mergedProcessors));
    return renderNodes(parseNodes(source, pattern).nodes, mergedProcessors);
};
