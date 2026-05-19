import React from "react";
import { defaultTerminalTheme } from "./styles";

const semanticPattern = /(\S+\.(?:cave|draft|art|bp|cvs))(?!\w)/giu;

const extensionColors: Record<string, string> = {
    ".cave": defaultTerminalTheme.colors.cave,
    ".draft": defaultTerminalTheme.colors.draft,
    ".art": defaultTerminalTheme.colors.art,
    ".bp": defaultTerminalTheme.colors.bp,
    ".cvs": defaultTerminalTheme.colors.cvs,
};

const colorForHit = (value: string) => {
    const match = /\.[^/.]+$/u.exec(value.toLowerCase());
    return (
        extensionColors[match?.[0] ?? ""] ??
        defaultTerminalTheme.colors.foreground
    );
};

const highlightSemanticSegment = (text: string): React.ReactNode => {
    const chunks: React.ReactNode[] = [];
    let cursor = 0;
    let hasMatch = false;
    for (const match of text.matchAll(semanticPattern)) {
        hasMatch = true;
        const hit = match[0] ?? "";
        const at = match.index ?? 0;
        if (at > cursor) chunks.push(text.slice(cursor, at));
        chunks.push(
            <span
                key={`${at}-${hit}`}
                style={{ fontWeight: 700, color: colorForHit(hit) }}
            >
                {hit}
            </span>,
        );
        cursor = at + hit.length;
    }
    if (cursor < text.length) chunks.push(text.slice(cursor));
    return hasMatch ? chunks : text;
};

export const highlightSemanticText = (text: string): React.ReactNode => {
    const lines = text.split("\n");
    if (lines.length === 1) {
        const commentIndex = text.indexOf("#");
        if (commentIndex < 0) return highlightSemanticSegment(text);
        const prefix = text.slice(0, commentIndex);
        const comment = text.slice(commentIndex);
        return [
            highlightSemanticSegment(prefix),
            <span
                key={`comment-${commentIndex}`}
                style={{
                    color: defaultTerminalTheme.colors.foreground,
                    opacity: 0.65,
                }}
            >
                {comment}
            </span>,
        ];
    }

    return lines.flatMap((line, index) => {
        const commentIndex = line.indexOf("#");
        const content = commentIndex < 0 ? line : line.slice(0, commentIndex);
        const comment = commentIndex < 0 ? "" : line.slice(commentIndex);
        const nodes: React.ReactNode[] = [highlightSemanticSegment(content)];
        if (comment) {
            nodes.push(
                <span
                    key={`comment-${index}-${commentIndex}`}
                    style={{
                        color: defaultTerminalTheme.colors.foreground,
                        opacity: 0.65,
                    }}
                >
                    {comment}
                </span>,
            );
        }
        if (index < lines.length - 1) nodes.push("\n");
        return nodes;
    });
};

export const highlightSemanticNode = (
    value: React.ReactNode,
): React.ReactNode => {
    if (typeof value === "string") return highlightSemanticText(value);
    if (Array.isArray(value))
        return value.map((item) => highlightSemanticNode(item));
    return value;
};
