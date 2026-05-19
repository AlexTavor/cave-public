import { describe, expect, it } from "vitest";
import React from "react";
import { highlightSemanticText } from "./syntaxHighlight";

describe("syntaxHighlight", () => {
    it("highlights supported semantic extensions", () => {
        const value = highlightSemanticText(
            "load data/core.bp and app/main.cave",
        );
        expect(Array.isArray(value)).toBe(true);
        const chunks = value as React.ReactNode[];
        const hits = chunks.filter(
            (item) => React.isValidElement(item) && item.type === "span",
        ) as React.ReactElement<{
            children?: React.ReactNode;
            style?: React.CSSProperties;
        }>[];
        expect(hits).toHaveLength(2);
        expect(hits[0].props.children).toBe("data/core.bp");
        expect(hits[1].props.children).toBe("app/main.cave");
        expect(hits[0].props.style?.color).toBeTruthy();
    });

    it("returns plain text when no semantic extension matches", () => {
        expect(highlightSemanticText("noop")).toBe("noop");
    });
    it("applies comment style per line in multiline text", () => {
        const value = highlightSemanticText("spawn cave/main.cave\n# comment");
        expect(Array.isArray(value)).toBe(true);
        const chunks = value as React.ReactNode[];
        const comment = chunks.find((item) => {
            if (!React.isValidElement(item)) return false;
            const props = (item as any).props as {
                children?: React.ReactNode;
            };
            return props.children === "# comment";
        }) as React.ReactElement<{ style?: React.CSSProperties }> | undefined;
        expect(comment).toBeDefined();
        expect(comment?.props.style?.opacity).toBe(0.65);
    });

    it("styles comment segment starting at #", () => {
        const value = highlightSemanticText("spawn thing # comment");
        expect(Array.isArray(value)).toBe(true);
        const chunks = value as React.ReactNode[];
        const commentChunk = chunks.find(
            (item) => React.isValidElement(item) && item.type === "span",
        ) as React.ReactElement<{
            children?: React.ReactNode;
            style?: React.CSSProperties;
        }>;
        expect(commentChunk.props.children).toBe("# comment");
        expect(commentChunk.props.style?.opacity).toBe(0.65);
    });
});
