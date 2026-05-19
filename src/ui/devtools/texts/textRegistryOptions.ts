import { TEXT_FIELD_CATEGORIES, TEXT_OWNER_TYPES } from "./types";
import type { TextOwnerBlock } from "./types";

export const collectCategoryOptions = (blocks: TextOwnerBlock[]) => [
    "all" as const,
    ...TEXT_FIELD_CATEGORIES.filter((category) =>
        blocks.some((block) =>
            block.fields.some((field) => field.category === category),
        ),
    ),
];

export const collectTypeOptions = (blocks: TextOwnerBlock[]) => [
    "all" as const,
    ...TEXT_OWNER_TYPES.filter((type) =>
        blocks.some((block) => block.ownerType === type),
    ),
];
