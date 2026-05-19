export type ResolvedType =
    | "number"
    | "string"
    | "boolean"
    | "object"
    | "unknown";

export interface SchemaNode {
    type: ResolvedType;
    children?: string[];
}
