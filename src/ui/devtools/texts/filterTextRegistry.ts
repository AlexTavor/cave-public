import type { TextFieldEntry, TextOwnerBlock } from "./types";

const matchesQuery = (
    block: TextOwnerBlock,
    field: TextFieldEntry,
    query: string,
) => {
    if (!query) return true;
    const normalized = query.toLowerCase();
    const blockMatch = [block.filename, block.ownerId, block.ownerType].some(
        (value) => value.toLowerCase().includes(normalized),
    );
    if (blockMatch) return true;
    return [field.label, field.value].some((value) =>
        value.toLowerCase().includes(normalized),
    );
};

export const filterTextRegistry = (
    blocks: TextOwnerBlock[],
    filters: {
        category: "all" | TextFieldEntry["category"];
        type: "all" | TextOwnerBlock["ownerType"];
        query: string;
    },
): TextOwnerBlock[] =>
    blocks
        .filter(
            (block) =>
                filters.type === "all" || block.ownerType === filters.type,
        )
        .map((block) => ({
            ...block,
            fields: block.fields.filter((field) => {
                if (
                    filters.category !== "all" &&
                    field.category !== filters.category
                ) {
                    return false;
                }
                return matchesQuery(block, field, filters.query.trim());
            }),
        }))
        .filter((block) => block.fields.length > 0);
