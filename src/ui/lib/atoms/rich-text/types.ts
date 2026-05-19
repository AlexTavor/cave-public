import { ReactNode } from "react";

export type RichTextVariant =
    | "body"
    | "header"
    | "narration"
    | "celebration"
    | "callout"
    | "title";

export interface RichTextProps {
    /**
     * The BBCode string to parse and render.
     */
    text: string;

    /**
     * Visual style variant.
     * @default "body"
     */
    variant?: RichTextVariant;

    /**
     * Optional CSS class name for the wrapper.
     */
    className?: string;
}

export type RichTextNode = string | RichTextTagNode;

export interface RichTextTagNode {
    tag: string;
    attr: string;
    children: RichTextNode[];
}

export interface RichTextProcessorHelpers {
    key: string;
    getTextContent: (children: RichTextNode[]) => string;
    renderChildren: (
        children: RichTextNode[],
        parentKey?: string,
    ) => ReactNode[];
}

export type RichTextProcessor = (
    node: RichTextTagNode,
    helpers: RichTextProcessorHelpers,
) => ReactNode;

/**
 * A function that resolves a reference type and ID into a ReactNode
 * (usually a tooltip content component like a BodyCard).
 */
export type RefResolver = (type: string, id: string) => ReactNode;

export interface RichTextContextValue {
    resolveRef?: RefResolver;
    processors?: Record<string, RichTextProcessor>;
}

